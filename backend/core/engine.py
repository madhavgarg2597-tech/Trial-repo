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
from gestures.virtual_mouse import VirtualMouse 

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
        
        self.activity_log = deque(maxlen=20)
        self.total_gesture_count = 0 
        self.custom_actions = {}
        self.activity_log = deque(maxlen=20)
        self.total_gesture_count = 0 
        self.custom_actions = {} 
        self.os_type = "windows"  # <--- NEW: Default to Windows 
        
        # Load Model
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_path = os.path.join(base_path, 'hand_landmarker.task')
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.HandLandmarkerOptions(
            base_options=base_options, num_hands=2,
            min_hand_detection_confidence=0.7, min_hand_presence_confidence=0.7, min_tracking_confidence=0.7
        )
        self.detector = vision.HandLandmarker.create_from_options(options)

        # Initialize Modules
        self.copy_paste = CopyPaste()
        self.screenshot = Screenshot()
        self.pro_snap = ProSnap()
        self.volume_control = VolumeControl()
        self.two_hand_zoom = TwoHandZoom()
        self.swipe_tabs = SwipeTabs()
        self.virtual_mouse = VirtualMouse() 

        # Config
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
            "mouse_beta": {"name": "Virtual Mouse (Beta)", "enabled": False, "trigger": "virtual_mouse_beta"}
        }

        self.position_buffer = deque(maxlen=20)
        self.alpha = 0.7
        self.prev_volume = 0
        self.prev_zoom = 100
        self.last_triggered = {key: 0 for key in self.gesture_settings}

    def register_custom_action(self, action_id, keys):
        """Allows dynamic key mapping injection."""
        self.custom_actions[action_id] = keys

    def start(self):
        if self.running: return
        self.cap = cv2.VideoCapture(0)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.running = True
        self.processing_thread = threading.Thread(target=self._run_loop, daemon=True)
        self.processing_thread.start()

    def stop(self):
        self.running = False
        if self.processing_thread: self.processing_thread.join()
        if self.cap: self.cap.release()

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
        
        # 1. Custom Actions
        if target_action in self.custom_actions and self._check_cooldown(gesture_id):
            try:
                keys = self.custom_actions[target_action]
                pyautogui.hotkey(*keys)
                self._log_activity(gesture_name, f"Custom: {target_action}")
                return 
            except Exception: pass

        # 2. Hardcoded Actions (Added interval=0.05 to prevent OS from dropping the keystrokes)
        # Determine which modifier keys to use based on the OS
        ctrl_key = 'command' if self.os_type == 'mac' else 'ctrl'
        win_key = 'command' if self.os_type == 'mac' else 'win'

        # 2. Hardcoded Actions (Dynamic for Mac vs Windows)
        mapping = {
            "save_file": lambda: pyautogui.hotkey(ctrl_key, 's', interval=0.05),
            "copy": lambda: pyautogui.hotkey(ctrl_key, 'c', interval=0.05),
            "paste": lambda: pyautogui.hotkey(ctrl_key, 'v', interval=0.05),
            # Note: Mac uses Cmd+MissionControl (F11 usually) to show desktop. 
            # We map it to Cmd+F3 or F11, but for now we'll map to win_key + d as placeholder
            "show_desktop": lambda: pyautogui.hotkey(win_key, 'd', interval=0.05), 
            "volume_control": lambda: pyautogui.press(sub_action),
            "zoom_control": lambda: pyautogui.hotkey(ctrl_key, sub_action, interval=0.05),
            "arrow_keys": lambda: self._execute_joystick(sub_action),
            "screenshot": lambda: self.take_screenshot(),
            "undo_redo": lambda: pyautogui.hotkey(ctrl_key, sub_action, interval=0.05),
            "switch_tabs": lambda: pyautogui.hotkey(ctrl_key, *sub_action, interval=0.05) if isinstance(sub_action, list) else pyautogui.hotkey(ctrl_key, sub_action, interval=0.05)
        }

        if target_action in mapping and self._check_cooldown(gesture_id):
            try:
                mapping[target_action]()
                self._log_activity(gesture_name, target_action)
            except Exception: pass

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
        
        hands_data = []
        handedness_list = []

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

        # Split Hands
        left_hand_data = [hd for i, hd in enumerate(hands_data) if handedness_list[i] == "Left"]
        right_hand_data = [hd for i, hd in enumerate(hands_data) if handedness_list[i] == "Right"]

        # Track Right Hand Position Buffer
        if right_hand_data:
            lm_list = right_hand_data[0][0].landmark
            palm_ids = [0,5,9,13,17]
            raw_cx = int(np.mean([lm_list[i].x for i in palm_ids]) * w)
            raw_cy = int(np.mean([lm_list[i].y for i in palm_ids]) * h)
            if self.position_buffer:
                prev_x, prev_y = self.position_buffer[-1]
                cx = int(self.alpha * prev_x + (1-self.alpha) * raw_cx)
                cy = int(self.alpha * prev_y + (1-self.alpha) * raw_cy)
            else: 
                cx, cy = raw_cx, raw_cy
            self.position_buffer.append((cx,cy))
        else:
            self.position_buffer.clear()

        # --- 1. TWO HANDS: ZOOM ---
        if len(hands_data) == 2 and self.gesture_settings["zoom"]["enabled"]:
            self.position_buffer.clear()
            frame, zoom_val = self.two_hand_zoom.process(frame, hands_data, w, h)
            if abs(zoom_val - self.prev_zoom) > 2:
                sub = '+' if zoom_val > self.prev_zoom else '-'
                self.trigger_action("zoom", sub)
                self.prev_zoom = zoom_val
            return frame

        # --- 2. LEFT HAND (Volume & Snap) ---
        if left_hand_data:
            hand_wrapper, fingers = left_hand_data[0]
            
            if self.gesture_settings["volume"]["enabled"]:
                frame, vol_percent = self.volume_control.process(frame, hand_wrapper, fingers, w, h)
                if self.volume_control.volume_mode and abs(vol_percent - self.prev_volume) > 5:
                    self.prev_volume = vol_percent
                    if self.total_gesture_count % 10 == 0: 
                        self._log_activity("Volume Control", f"Set to {vol_percent}%")
                        
            if self.gesture_settings["snap"]["enabled"]:
                frame, snap_action = self.pro_snap.process(frame, left_hand_data)
                if snap_action == "RUN_CODE": 
                    self.trigger_action("snap")

        # --- 3. RIGHT HAND (Mouse OR Normal Gestures) ---
        if right_hand_data:
            hand_wrapper, fingers = right_hand_data[0]
            lm_list = hand_wrapper.landmark
            
            # A: VIRTUAL MOUSE
            if self.gesture_settings["mouse_beta"]["enabled"]:
                frame, mouse_action = self.virtual_mouse.process(frame, lm_list, "Right", w, h)
            
            # B: STANDARD GESTURES
            else:
                # Get individual finger states (1 = UP, 0 = DOWN)
                thumb, index, middle, ring, pinky = fingers
                
                # STRICT POSES:
                is_open_palm = index and middle and ring and pinky
                is_index_only = index and not middle and not ring and not pinky
                is_peace_sign = index and middle and not ring and not pinky

                # 1. Swipe Tabs (STRICT: Requires Open Palm + Stable Tracking)
                if self.gesture_settings["swipe"]["enabled"] and is_open_palm and len(self.position_buffer) >= 10:
                    
                    # Calculate velocity over 5 frames instead of 1 frame for smooth, deliberate movement
                    vx = self.position_buffer[-1][0] - self.position_buffer[-5][0]
                    
                    # Add a hard threshold (must move at least 30 pixels) to ignore micro-jitters
                    if abs(vx) > 30:
                        frame, swipe_action = self.swipe_tabs.process(frame, right_hand_data, vx)
                        
                        if swipe_action == "NEXT_TAB": 
                            self.trigger_action("swipe", "tab")
                            self.position_buffer.clear() # Clear memory to prevent double-swiping
                            
                        elif swipe_action == "PREV_TAB": 
                            self.trigger_action("swipe", ["shift", "tab"])
                            self.position_buffer.clear() # Clear memory to prevent double-swiping
                    
                # 2. Circular Undo/Redo (Requires ONLY Index Finger)
                if self.gesture_settings["circular"]["enabled"] and is_index_only:
                    if self.position_buffer:
                        cx, cy = self.position_buffer[-1]
                        idx_tip = lm_list[8]
                        hx, hy = int(idx_tip.x * w), int(idx_tip.y * h)
                        
                        circ_action = compute_circular_command(hx, hy, (cx, cy))
                        if circ_action == "UNDO": self.trigger_action("circular", "z")
                        elif circ_action == "REDO": self.trigger_action("circular", "y")
                            
                # 3. Text Joystick (Requires PEACE SIGN)
                if self.gesture_settings["text_mode"]["enabled"] and is_peace_sign:
                    if self.position_buffer:
                        cx, cy = self.position_buffer[-1]
                        idx_tip = lm_list[8]
                        hx, hy = int(idx_tip.x * w), int(idx_tip.y * h)
                        try:
                            text_action = compute_text_joystick(hx, hy, (cx, cy))
                            if text_action and text_action != "NONE": 
                                self.trigger_action("text_mode", text_action)
                        except: pass

                # 4. Copy / Paste (Internal logic handles pinch detection)
                if self.gesture_settings["copy"]["enabled"] or self.gesture_settings["paste"]["enabled"]:
                    try:
                        frame, cp_action = self.copy_paste.process(frame, right_hand_data)
                        if cp_action == "COPY": self.trigger_action("copy")
                        elif cp_action == "PASTE": self.trigger_action("paste")
                    except: pass
                    
                # 5. Screenshot (Internal logic handles 4 fingers + Y velocity)
                if self.gesture_settings["screenshot"]["enabled"] and len(self.position_buffer) >= 2:
                    vy = self.position_buffer[-1][1] - self.position_buffer[-2][1]
                    try:
                        frame, scr_action = self.screenshot.process(frame, right_hand_data, vy)
                        if scr_action == "SCREENSHOT": self.trigger_action("screenshot")
                    except: pass

        return frame