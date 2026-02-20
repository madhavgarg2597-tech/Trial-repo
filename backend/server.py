from fastapi.responses import StreamingResponse
import time
from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import asyncio

# --- 1. SETUP & CONFIG ---
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Database Connection (Lowered timeout to 1s to prevent "Unavailable" lag)
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
try:
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=1000)
    db = client[os.environ.get('DB_NAME', 'gesture_db')]
except Exception as e:
    client = None
    db = None

# Initialize Gesture Engine
import sys
# Add current directory to Python path to find 'gestures' folder
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from engine import GestureEngine
    gesture_engine = GestureEngine()
    print("✅ ENGINE LOADED SUCCESSFULLY")
except Exception as e:
    print(f"❌ CRITICAL ENGINE ERROR: {e}")
    gesture_engine = None

# --- MODELS ---
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GestureConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    sensitivity: Optional[float] = None
    cooldown: Optional[float] = None
    trigger: Optional[str] = None

# Action Mapping Model (Merged from Maddy's Branch)
class CustomAction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    keys: List[str]

# --- ROUTER ---
api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root(): return {"message": "GestureOS Backend Running"}

# --- ENGINE CONTROL & STATS ---

@api_router.get("/engine/status")
async def get_engine_status():
    if not gesture_engine:
        return {"running": False, "error": "Engine not initialized", "count": 0}
    
    total_count = getattr(gesture_engine, 'total_gesture_count', 0)
    return {"running": gesture_engine.running, "count": total_count}

@api_router.post("/engine/start")
async def start_engine():
    if not gesture_engine: raise HTTPException(500, "No Engine")
    if not gesture_engine.running:
        gesture_engine.start()
        return {"status": "started"}
    return {"status": "already_running"}

@api_router.post("/engine/stop")
async def stop_engine():
    if not gesture_engine: raise HTTPException(500, "No Engine")
    if gesture_engine.running:
        gesture_engine.stop()
        return {"status": "stopped"}
    return {"status": "already_stopped"}

# --- ACTIVITY LOG ---
@api_router.get("/activity")
async def get_activity_log():
    if not gesture_engine: return []
    return list(getattr(gesture_engine, 'activity_log', []))

# --- GESTURE CONFIGURATION ---
@api_router.get("/gestures")
async def get_gestures():
    if not gesture_engine: return []
    res = []
    settings = gesture_engine.gesture_settings.copy()
    for k, v in settings.items():
        data = v.copy(); data["id"] = k
        res.append(data)
    return res

@api_router.patch("/gestures/{gesture_id}")
async def update_gesture(gesture_id: str, config: GestureConfigUpdate):
    if not gesture_engine: raise HTTPException(500, "No Engine")
    data = config.model_dump(exclude_unset=True)
    if gesture_engine.update_gesture_config(gesture_id, data):
        if db is not None:
            try:
                await db.gesture_configs.update_one({"gesture_id": gesture_id}, {"$set": data}, upsert=True)
            except: pass
        return {"status": "updated"}
    raise HTTPException(404, "Not found")


# --- CUSTOM ACTIONS ENDPOINTS (Merged from Maddy's Branch) ---
@api_router.post("/custom-actions")
async def create_custom_action(action: CustomAction):
    if not gesture_engine: raise HTTPException(500, "No Engine")
    
    # 1. Register in the live python engine
    gesture_engine.register_custom_action(action.id, action.keys)
    
    # 2. Save permanently to DB
    if db is not None:
        try: await db.custom_actions.insert_one(action.model_dump())
        except: pass
        
    return {"status": "created", "id": action.id}

@api_router.get("/custom-actions")
async def get_custom_actions():
    if db is not None:
        try:
            cursor = db.custom_actions.find({}, {'_id': 0})
            actions = await cursor.to_list(length=100)
            return actions
        except: pass
    return []


# --- STATUS ---
@api_router.post("/status")
async def create_status(input: StatusCheck):
    if db is not None:
        try:
            doc = input.model_dump()
            doc['timestamp'] = doc['timestamp'].isoformat()
            await db.status_checks.insert_one(doc)
        except: pass
    return input

def generate_frames():
    while True:
        if gesture_engine and gesture_engine.running:
            # Grab the latest frame directly from the brain
            with gesture_engine.lock:
                frame_data = gesture_engine.current_frame

            if frame_data:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_data + b'\r\n')
            else:
                time.sleep(0.01)
        else:
            time.sleep(0.1)

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

app.include_router(api_router)

# --- LIFESPAN EVENTS ---
@app.on_event("startup")
async def startup_event():
    if gesture_engine is not None and db is not None:
        try:
            await client.admin.command('ping') 
            logger.info("Connected to MongoDB.")
            
            # 1. Load Gesture Configs
            cursor = db.gesture_configs.find({})
            async for config in cursor:
                g_id = config.pop("gesture_id", None)
                if g_id: gesture_engine.update_gesture_config(g_id, config)
                
            # 2. Load custom shortcuts into engine on startup (Merged from Maddy's Branch)
            cursor_actions = db.custom_actions.find({})
            async for action in cursor_actions:
                gesture_engine.register_custom_action(action['id'], action['keys'])
                
        except Exception:
            logger.warning("MongoDB unavailable. Using defaults.")

@app.on_event("shutdown")
async def shutdown_event():
    if gesture_engine: gesture_engine.stop()
    if client: client.close()

# --- WEBSOCKETS ---
@app.websocket("/ws/video")
async def websocket_video_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("🔌 WEB-SOCKET: High-Speed Video Pipe Open")
    try:
        while True:
            if gesture_engine and gesture_engine.current_frame:
                with gesture_engine.lock:
                    frame_data = gesture_engine.current_frame
                
                # Send the RAW bytes for zero-lag transmission
                await websocket.send_bytes(frame_data)
            
            # FPS control
            await asyncio.sleep(0.03) 
            
    except WebSocketDisconnect:
        print("🔌 WEB-SOCKET: Client disconnected")
    except Exception as e:
        print(f"❌ WEB-SOCKET Error: {e}") 

# --- MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)