from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone

# --- 1. SETUP & CONFIG ---
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- 2. INITIALIZE APP & SERVICES ---
app = FastAPI()

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'gesture_db')]

# Initialize the Gesture Engine
try:
    from core.engine import GestureEngine
    gesture_engine = GestureEngine()
except ImportError:
    logger.warning("GestureEngine could not be imported. Ensure backend/core/engine.py exists.")
    gesture_engine = None

# --- 3. LIFESPAN EVENTS ---
@app.on_event("startup")
async def startup_event():
    # REMOVED: gesture_engine.start() 
    # The camera will now stay OFF until a client actually connects.
    logger.info("Server started. Camera is in STANDBY mode.")

@app.on_event("shutdown")
async def shutdown_event():
    if gesture_engine:
        gesture_engine.stop()
    client.close()
    logger.info("Server shut down.")


# --- 4. WEBSOCKETS (The Fix is Here) ---
@app.websocket("/ws/video")
async def video_feed(websocket: WebSocket):
    await websocket.accept()
    
    if not gesture_engine:
        await websocket.close(reason="Gesture Engine not available")
        return
        
    # START CAMERA ONLY WHEN CONNECTED
    print("Client connected: Starting Camera...")
    gesture_engine.start()

    try:
        async for frame_bytes in gesture_engine.get_frame():
            await websocket.send_bytes(frame_bytes)
    except WebSocketDisconnect:
        logger.info("Client disconnected from video feed")
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
    finally:
        # STOP CAMERA IMMEDIATELY WHEN DISCONNECTED
        print("Client disconnected: Stopping Camera...")
        gesture_engine.stop()


# --- 5. REST API ROUTES ---
api_router = APIRouter(prefix="/api")

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

@api_router.get("/")
async def root():
    return {"message": "GestureOS Backend Running"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

app.include_router(api_router)

# --- 6. MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)