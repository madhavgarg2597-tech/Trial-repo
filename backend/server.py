from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
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
import pymongo
import asyncio

# --- 1. SETUP & CONFIG ---
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- 2. INITIALIZE APP & SERVICES ---
app = FastAPI()

# Database Connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
try:
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[os.environ.get('DB_NAME', 'gesture_db')]
except Exception as e:
    logger.error(f"Failed to initialize MongoDB client: {e}")
    client = None
    db = None

# Initialize Gesture Engine
try:
    from core.engine import GestureEngine
    gesture_engine = GestureEngine()
except ImportError:
    logger.warning("GestureEngine could not be imported.")
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
api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"message": "GestureOS Backend Running"}

# --- ENGINE CONTROL ROUTES (THE MISSING PART) ---

@api_router.get("/engine/status")
async def get_engine_status():
    """Checks if the background service is running"""
    if not gesture_engine:
        return {"running": False, "error": "Engine not initialized"}
    return {"running": gesture_engine.running}

@api_router.post("/engine/start")
async def start_engine():
    """Manually starts the background service"""
    if not gesture_engine:
        raise HTTPException(status_code=500, detail="Engine not found")
    
    if not gesture_engine.running:
        gesture_engine.start() # Starts the background thread
        return {"status": "started", "message": "Background service active"}
    return {"status": "already_running"}

@api_router.post("/engine/stop")
async def stop_engine():
    """Manually stops the background service"""
    if not gesture_engine:
        raise HTTPException(status_code=500, detail="Engine not found")
    
    if gesture_engine.running:
        gesture_engine.stop() # Stops the background thread
        return {"status": "stopped", "message": "Background service stopped"}
    return {"status": "already_stopped"}

# --- GESTURE CONFIGURATION ROUTES ---

@api_router.get("/gestures")
async def get_gestures():
    if not gesture_engine: return []
    gesture_list = []
    # Use copy to avoid runtime changes during iteration
    settings_copy = gesture_engine.gesture_settings.copy()
    for key, value in settings_copy.items():
        gesture_data = value.copy()
        gesture_data["id"] = key
        gesture_list.append(gesture_data)
    return gesture_list

@api_router.patch("/gestures/{gesture_id}")
async def update_gesture_config(gesture_id: str, config: GestureConfigUpdate):
    if not gesture_engine: raise HTTPException(status_code=500, detail="Engine not initialized")
    
    update_data = config.model_dump(exclude_unset=True)
    success = gesture_engine.update_gesture_config(gesture_id, update_data)
    
    if success:
        if db is not None:
            try:
                await db.gesture_configs.update_one(
                    {"gesture_id": gesture_id},
                    {"$set": update_data},
                    upsert=True
                )
            except Exception as e:
                logger.error(f"Database Save Error: {e}")
        return {"status": "updated", "id": gesture_id, "data": update_data}
    
    raise HTTPException(status_code=404, detail="Gesture not found")

@api_router.delete("/gestures/{gesture_id}")
async def delete_gesture(gesture_id: str):
    if not gesture_engine: return {"error": "Engine error"}
    
    success = gesture_engine.delete_gesture(gesture_id)
    if success and db is not None:
        await db.gesture_configs.delete_one({"gesture_id": gesture_id})
        return {"status": "deleted", "id": gesture_id}
    elif success:
        return {"status": "deleted_memory_only", "id": gesture_id}
    return {"error": "Gesture not found"}

# --- SYSTEM STATUS ROUTES ---

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    if db is None: raise HTTPException(status_code=530, detail="Database unavailable")
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    if db is None: return []
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

app.include_router(api_router)

# --- 5. LIFESPAN EVENTS ---
@app.on_event("startup")
async def startup_event():
    # MANUAL MODE: Camera does NOT start automatically.
    # It waits for the user to click the toggle in the frontend.
    
    if gesture_engine and db is not None:
        try:
            await client.admin.command('ping') 
            logger.info("Connected to MongoDB.")
            cursor = db.gesture_configs.find({})
            async for config in cursor:
                g_id = config.pop("gesture_id", None)
                if g_id:
                    gesture_engine.update_gesture_config(g_id, config)
            logger.info("Settings synced from DB.")
        except Exception:
            logger.warning("MongoDB unavailable. Using defaults.")

@app.on_event("shutdown")
async def shutdown_event():
    if gesture_engine:
        gesture_engine.stop()
    if client:
        client.close()
    logger.info("Server shut down.")

# --- 6. WEBSOCKETS ---
@app.websocket("/ws/video")
async def video_feed(websocket: WebSocket):
    await websocket.accept()
    if not gesture_engine:
        await websocket.close(reason="Engine unavailable")
        return
        
    try:
        # Loop forever while the client is connected
        while True:
            if gesture_engine.running:
                # If Camera ON: Stream frames from the background thread
                async for frame_bytes in gesture_engine.get_video_stream():
                    await websocket.send_bytes(frame_bytes)
                    # If engine stops mid-stream, break to outer loop
                    if not gesture_engine.running: break
            else:
                # If Camera OFF: Wait patiently (don't disconnect)
                await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        logger.info("Client disconnected (Service continues)")
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")

# --- 7. MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)