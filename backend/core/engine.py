import cv2
import mediapipe as mp
import numpy as np
import os
import threading
import asyncio
import pyautogui
import time
import uuid
from datetime import datetime
from collections import deque
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# --- GESTURE MODULES ---
from gestures.circular_undo_redo import compute_circular_command
from gestures.volume_control import VolumeControl
from gestures.two_hand_zoom import TwoHandZoom
from gestures.swipe_tabs import SwipeTabs
from gestures.Pro_snap import ProSnap
from gestures.copy_paste import CopyPaste
from gestures.screenshot import Screenshot
from gestures.text_joystick import compute_text_joystick
from gestures.virtual_mouse import VirtualMouse # <--- NEW IMPORT

# --- SETUP ---
pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0.01

class GestureEngine:
    def __init__(self):
        self.running = False
        self.cap = None
        self.lock = threading.Lock()
        self.current_frame = None
        self.processing_thread = None
        
        # Logging State
        self.activity_log = deque(maxlen=20)
        self.total_gesture_count = 0 
        
        # 1. Load Model
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_path = os.path.join(base_path, 'hand_landmarker.task')
        if not os.path.exists(model_path): print(f"ERROR: Model not found at {model_path}")
        
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.HandLandmarkerOptions(
            base_options=base_options, num_hands=2,
            min_hand_detection_confidence=0.7, min_hand_presence_confidence=0.7, min_tracking_confidence=0.7
        )
        self.detector = vision.HandLandmarker.create_from_options(options)

        # 2. Initialize Modules
        self.copy_paste = CopyPaste()
        self.screenshot = Screenshot()
        self.pro_snap = ProSnap()
        self.volume_control = VolumeControl()
        self.two_hand_zoom = TwoHandZoom()
        self.swipe_tabs = SwipeTabs()
        self.virtual_mouse = VirtualMouse() # <--- INITIALIZED

        # 3. GESTURE CONFIGURATION
        self.gesture_settings = {
            "volume": {"name": "Volume Control", "enabled": True, "sensitivity": 0.7, "cooldown": 0.1, "trigger": "volume_control"},
            "zoom": {"name": "Two-Hand Zoom", "enabled": True, "sensitivity": 0.7, "cooldown": 0.2, "trigger": "zoom_control"},
            "swipe": {"name": "Swipe Tabs", "enabled": True, "sensitivity": 0.7, "cooldown": 0.8, "trigger": "switch_tabs"},
            "snap": {"name": "Snap Action", "enabled": True, "sensitivity": 0.7, "cooldown": 1.5, "trigger": "show_desktop"},
            "copy": {"name": "Copy Gesture", "enabled": True, "sensitivity": 0.7, "cooldown": 1.0, "trigger": "copy"},
            "paste": {"name": "Paste Gesture", "enabled": True, "sensitivity": 0.7, "cooldown": 1.0, "trigger": "paste"},
            "screenshot": {"name": "Screenshot", "enabled": True, "sensitivity": 0.7, "cooldown": 2.0, "trigger": "screenshot"},
            "text_mode": {"name": "Text Joystick", "enabled": True, "sensitivity": 0.7, "cooldown": 0.15, "trigger": "arrow_keys"},
            "circular": {"name": "Undo/Redo Menu", "enabled": True, "sensitivity": 0.7, "cooldown": 1.0, "trigger": "undo_redo"},
            
            # BETA MOUSE SETTING
            "mouse_beta": {"name": "Virtual Mouse (Beta)", "enabled": False, "trigger": "virtual_mouse_beta"}
        }

        # 4. State Variables
        self.dominant_hand = "Right"
        self.position_buffer = deque(maxlen=20)
        self.alpha = 0.7
        self.prev_volume = 0
        self.prev_zoom = 100
        self.last_triggered = {key: 0 for key in self.gesture_settings}
        self.text_mode_active = False 
        self.peace_counter = 0
        self.PEACE_HOLD_FRAMES = 15
        self.last_joystick_time = 0
        self.circular_display_text = None
        self.circular_display_timer = 0
        self.DISPLAY_FRAMES = 20

    def start(self):
        if self.running: return
        self.cap = cv2.VideoCapture(0)
        # OPTIMIZE CAMERA FOR MOUSE
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        self.running = True
        self.processing_thread = threading.Thread(target=self._run_loop, daemon=True)
        self.processing_thread.start()
        print("✅ Gesture Engine started.")

    def stop(self):
        self.running = False
        if self.processing_thread: self.processing_thread.join()
        if self.cap: self.cap.release()
        print("🛑 Gesture Engine stopped.")

    def _run_loop(self):
        while self.running and self.cap.isOpened():
            success, frame = self.cap.read()
            if not success:
                time.sleep(0.1)
                continue
            try:
                processed_frame = self._process_frame(frame)
                ret, buffer = cv2.imencode('.jpg', processed_frame)
                if ret:
                    with self.lock: self.current_frame = buffer.tobytes()
            except Exception as e: print(f"Frame Processing Error: {e}")
            time.sleep(0.01)

    async def get_video_stream(self):
        while self.running:
            with self.lock: frame = self.current_frame
            if frame: yield frame
            await asyncio.sleep(0.033)

    def update_gesture_config(self, gesture_id, config):
        if gesture_id in self.gesture_settings:
            for key, value in config.items():
                if key in self.gesture_settings[gesture_id]:
                    self.gesture_settings[gesture_id][key] = value
            return True
        return False

    def _check_cooldown(self, gesture_id):
        now = time.time()
        last = self.last_triggered.get(gesture_id, 0)
        cooldown = self.gesture_settings[gesture_id]["cooldown"]
        if now - last > cooldown:
            self.last_triggered[gesture_id] = now
            return True
        return False

    def _log_activity(self, gesture_name, action_id):
        self.total_gesture_count += 1
        entry = {"id": str(uuid.uuid4()), "gesture": gesture_name, "action": action_id, "time": datetime.now().isoformat()}
        self.activity_log.appendleft(entry)

    def trigger_action(self, gesture_id, sub_action=None):
        if not self.gesture_settings[gesture_id]["enabled"]: return
        target_action = self.gesture_settings[gesture_id]["trigger"]
        gesture_name = self.gesture_settings[gesture_id]["name"]
        
        # Simplified Trigger Logic
        mapping = {
            "save_file": lambda: pyautogui.hotkey('ctrl', 's'),
            "copy": lambda: pyautogui.hotkey('ctrl', 'c'),
            "paste": lambda: pyautogui.hotkey('ctrl', 'v'),
            "show_desktop": lambda: pyautogui.hotkey('win', 'd'),
            "volume_control": lambda: pyautogui.press(sub_action),
            "zoom_control": lambda: pyautogui.hotkey('ctrl', sub_action),
            "arrow_keys": lambda: self._execute_joystick(sub_action),
            "screenshot": lambda: self.take_screenshot(),
            "undo_redo": lambda: pyautogui.hotkey('ctrl', sub_action),
            "switch_tabs": lambda: pyautogui.hotkey('ctrl', *sub_action) if isinstance(sub_action, list) else pyautogui.hotkey('ctrl', sub_action)
        }

        if target_action in mapping and self._check_cooldown(gesture_id):
            try:
                mapping[target_action]()
                self._log_activity(gesture_name, target_action)
            except Exception as e: print(f"Action Failed: {e}")

    def _execute_joystick(self, direction):
        if direction and direction != "NONE":
            pyautogui.keyDown('shift')
            pyautogui.press(direction.lower())
            pyautogui.keyUp('shift')

    def take_screenshot(self):
        try:
            save_dir = os.path.join(os.path.expanduser("~"), "Pictures", "Screenshots")
            if not os.path.exists(save_dir): os.makedirs(save_dir)
            path = os.path.join(save_dir, f"GestureOS_{int(time.time())}.png")
            pyautogui.screenshot(path)
            return True
        except: return False

    def _draw_hand(self, image, landmarks):
        h, w, _ = image.shape
        HAND_CONNECTIONS = [(0,1),(1,2),(2,3),(3,4),(0,5),(5,6),(6,7),(7,8),(5,9),(9,10),(10,11),(11,12),(9,13),(13,14),(14,15),(15,16),(13,17),(17,18),(18,19),(19,20),(0,17)]
        for connection in HAND_CONNECTIONS:
            start_pt = (int(landmarks[connection[0]].x * w), int(landmarks[connection[0]].y * h))
            end_pt = (int(landmarks[connection[1]].x * w), int(landmarks[connection[1]].y * h))
            cv2.line(image, start_pt, end_pt, (255,255,255), 2)
        for lm in landmarks:
            cv2.circle(image, (int(lm.x * w), int(lm.y * h)), 4, (0,0,255), -1)

    def _get_finger_states(self, landmarks, handedness):
        fingers = []
        if handedness == "Right": fingers.append(1 if landmarks[4].x < landmarks[3].x else 0)
        else: fingers.append(1 if landmarks[4].x > landmarks[3].x else 0)
        for tip, pip in [(8,6), (12,10), (16,14), (20,18)]: fingers.append(1 if landmarks[tip].y < landmarks[pip].y else 0)
        return fingers

    def _process_frame(self, frame):
        frame = cv2.flip(frame, 1)  
        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self.detector.detect(mp_image)
        
        hands_data, handedness_list = [], []

        if result.hand_landmarks:
            for idx, lm_list in enumerate(result.hand_landmarks):
                self._draw_hand(frame, lm_list)
                raw_label = result.handedness[idx][0].category_name
                handedness = "Right" if raw_label == "Left" else "Left"
                handedness_list.append(handedness)

                class LandmarkWrapper:
                    def __init__(self, l): self.landmark = l
                
                fingers = self._get_finger_states(lm_list, handedness)
                hands_data.append((LandmarkWrapper(lm_list), fingers))

                # --- BETA MOUSE CHECK (Right Hand Only) ---
                if handedness == self.dominant_hand and self.gesture_settings["mouse_beta"]["enabled"]:
                    frame, mouse_action = self.virtual_mouse.process(frame, lm_list, handedness, w, h)
                    # Skip other gestures if mouse is active
                    continue 

                # --- POSITION BUFFER (Only if Mouse is OFF) ---
                if not self.gesture_settings["mouse_beta"]["enabled"] and idx == 0:
                    palm_ids = [0,5,9,13,17]
                    raw_cx = int(np.mean([lm_list[i].x for i in palm_ids]) * w)
                    raw_cy = int(np.mean([lm_list[i].y for i in palm_ids]) * h)
                    if self.position_buffer:
                        prev_x, prev_y = self.position_buffer[-1]
                        cx = int(self.alpha * prev_x + (1-self.alpha) * raw_cx)
                        cy = int(self.alpha * prev_y + (1-self.alpha) * raw_cy)
                    else: cx, cy = raw_cx, raw_cy
                    self.position_buffer.append((cx,cy))
        
        else: self.position_buffer.clear()

        # --- OTHER GESTURES (Volume, Zoom, etc.) ---
        # Only run these if MOUSE IS OFF to prevent conflicts
        if not self.gesture_settings["mouse_beta"]["enabled"]:
            if len(hands_data) == 2 and self.gesture_settings["zoom"]["enabled"]:
                self.position_buffer.clear()
                frame, zoom_val = self.two_hand_zoom.process(frame, hands_data, w, h)
                if abs(zoom_val - self.prev_zoom) > 2:
                    sub = '+' if zoom_val > self.prev_zoom else '-'
                    self.trigger_action("zoom", sub)
                    self.prev_zoom = zoom_val

            elif len(hands_data) == 1:
                hand_wrapper, fingers = hands_data[0]
                current_hand = handedness_list[0]
                
                # Non-Dominant Hand = Volume
                if current_hand != self.dominant_hand and self.gesture_settings["volume"]["enabled"]:
                    frame, vol_percent = self.volume_control.process(frame, hand_wrapper, fingers, w, h)
                    if self.volume_control.volume_mode and abs(vol_percent - self.prev_volume) > 5:
                        self.prev_volume = vol_percent
                        if self.total_gesture_count % 10 == 0: 
                            self._log_activity("Volume Control", f"Set to {vol_percent}%")

                # Dominant Hand = Swipes, Snaps, etc.
                elif current_hand == self.dominant_hand:
                    if self.gesture_settings["snap"]["enabled"]:
                        frame, snap_action = self.pro_snap.process(frame, hands_data)
                        if snap_action == "RUN_CODE": self.trigger_action("snap")

                    if self.gesture_settings["swipe"]["enabled"]:
                         # Velocity calculation needs buffer
                         if len(self.position_buffer) >= 2:
                             vx = self.position_buffer[-1][0] - self.position_buffer[-2][0]
                             frame, swipe_action = self.swipe_tabs.process(frame, hands_data, vx)
                             if swipe_action == "NEXT_TAB": self.trigger_action("swipe", "tab")
                             elif swipe_action == "PREV_TAB": self.trigger_action("swipe", ["shift", "tab"])

        return frame