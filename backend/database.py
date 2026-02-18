from motor.motor_asyncio import AsyncIOMotorClient
from models import Gesture, ActionMap, SystemSettings
from typing import List, Optional
import os

# Get DB URL from .env (make sure MONGO_URL is in your .env file)
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "gesture_controller")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# --- Settings Operations ---
async def get_settings() -> SystemSettings:
    """Get the global settings, or create default if not exists."""
    doc = await db.settings.find_one({"_id": "global_settings"})
    if doc:
        return SystemSettings(**doc)
    
    # Create default settings
    default_settings = SystemSettings()
    await db.settings.insert_one(default_settings.model_dump(by_alias=True))
    return default_settings

async def update_settings(update_data: dict) -> SystemSettings:
    """Update specific fields in settings."""
    await db.settings.update_one(
        {"_id": "global_settings"},
        {"$set": update_data}
    )
    return await get_settings()

# --- Gesture Operations ---
async def get_all_gestures() -> List[Gesture]:
    gestures = []
    async for doc in db.gestures.find():
        gestures.append(Gesture(**doc))
    return gestures

async def create_gesture(gesture: Gesture):
    await db.gestures.insert_one(gesture.model_dump(by_alias=True))
    return gesture

async def delete_gesture(gesture_id: str):
    await db.gestures.delete_one({"_id": gesture_id})

# --- Action Map Operations ---
async def get_action_maps() -> List[ActionMap]:
    actions = []
    async for doc in db.actions.find():
        actions.append(ActionMap(**doc))
    return actions

async def save_action_map(action: ActionMap):
    # Upsert: Update if exists, Insert if not
    await db.actions.update_one(
        {"_id": action.id},
        {"$set": action.model_dump(by_alias=True)},
        upsert=True
    )
    return action