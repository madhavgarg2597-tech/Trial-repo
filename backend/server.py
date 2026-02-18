from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, Union
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

# --- 3. API MODELS ---
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class GestureConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    sensitivity: Optional[float] = None
    cooldown: Optional[float] = None
    trigger: Optional[str] = None

# --- 4. API ROUTER SETUP ---
# CRITICAL: This must be defined BEFORE the routes below
api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"message": "GestureOS Backend Running"}

# --- GESTURE CONFIGURATION ROUTES ---

@api_router.get("/gestures")
async def get_gestures():
    """Returns the FULL list of gestures with all settings"""
    if not gesture_engine:
        return []
    
    gesture_list = []
    for key, value in gesture_engine.gesture_settings.items():
        gesture_data = value.copy()
        gesture_data["id"] = key
        gesture_list.append(gesture_data)
    return gesture_list

@api_router.patch("/gestures/{gesture_id}")
async def update_gesture_config(gesture_id: str, config: GestureConfigUpdate):
    """Updates any setting: enabled, sensitivity, cooldown, trigger"""
    if not gesture_engine:
        return {"error": "Engine not initialized"}
    
    update_data = config.model_dump(exclude_unset=True)
    
    success = gesture_engine.update_gesture_config(gesture_id, update_data)
    if success:
        return {"status": "updated", "id": gesture_id, "data": update_data}
    return {"error": "Gesture not found"}

@api_router.delete("/gestures/{gesture_id}")
async def delete_gesture(gesture_id: str):
    """Soft deletes a gesture"""
    if not gesture_engine: return {"error": "Engine error"}
    
    success = gesture_engine.delete_gesture(gesture_id)
    if success:
        return {"status": "deleted", "id": gesture_id}
    return {"error": "Gesture not found"}

# --- SYSTEM STATUS ROUTES ---

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

# Register the router with the app
app.include_router(api_router)

# --- 5. LIFESPAN EVENTS ---
@app.on_event("startup")
async def startup_event():
    logger.info("Server started. Camera is in STANDBY mode.")

@app.on_event("shutdown")
async def shutdown_event():
    if gesture_engine:
        gesture_engine.stop()
    client.close()
    logger.info("Server shut down.")

# --- 6. WEBSOCKETS ---
@app.websocket("/ws/video")
async def video_feed(websocket: WebSocket):
    await websocket.accept()
    
    if not gesture_engine:
        await websocket.close(reason="Gesture Engine not available")
        return
        
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
        print("Client disconnected: Stopping Camera...")
        gesture_engine.stop()

# --- 7. MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)