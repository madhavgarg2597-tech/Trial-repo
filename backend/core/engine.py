import cv2
import mediapipe as mp
import numpy as np
import os
import threading
import asyncio
import pyautogui
import time
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
        
        # 1. Load Model
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_path = os.path.join(base_path, 'hand_landmarker.task')
        
        if not os.path.exists(model_path):
            print(f"ERROR: Model not found at {model_path}")

        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=2,
            min_hand_detection_confidence=0.7,
            min_hand_presence_confidence=0.7,
            min_tracking_confidence=0.7
        )
        self.detector = vision.HandLandmarker.create_from_options(options)

        # 2. Initialize Modules
        self.copy_paste = CopyPaste()
        self.screenshot = Screenshot()
        self.pro_snap = ProSnap()
        self.volume_control = VolumeControl()
        self.two_hand_zoom = TwoHandZoom()
        self.swipe_tabs = SwipeTabs()

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
            "circular": {"name": "Undo/Redo Menu", "enabled": True, "sensitivity": 0.7, "cooldown": 1.0, "trigger": "undo_redo"}
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

    # --- SCREENSHOT HELPER ---
    def take_screenshot(self):
        """Saves screenshot to the system's Pictures/Screenshots folder"""
        try:
            # 1. Detect User's Home Directory
            home_dir = os.path.expanduser("~")
            
            # 2. Construct Path (Works on Windows/Mac/Linux)
            # Tries to find 'Pictures', if not, defaults to Home
            if os.path.exists(os.path.join(home_dir, "Pictures")):
                save_dir = os.path.join(home_dir, "Pictures", "Screenshots")
            else:
                save_dir = os.path.join(home_dir, "Screenshots")

            # 3. Create Folder if it doesn't exist
            if not os.path.exists(save_dir):
                os.makedirs(save_dir)

            # 4. Generate Filename and Save
            filename = f"GestureOS_{int(time.time())}.png"
            full_path = os.path.join(save_dir, filename)
            
            pyautogui.screenshot(full_path)
            print(f"📸 Screenshot Saved: {full_path}")
            return True
        except Exception as e:
            print(f"❌ Screenshot Failed: {e}")
            return False

    def start(self):
        if self.running: return
        self.cap = cv2.VideoCapture(0)
        self.running = True
        self.processing_thread = threading.Thread(target=self._run_loop, daemon=True)
        self.processing_thread.start()
        print("✅ Gesture Engine started in BACKGROUND MODE.")

    def stop(self):
        self.running = False
        if self.processing_thread:
            self.processing_thread.join()
        if self.cap:
            self.cap.release()
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
                    with self.lock:
                        self.current_frame = buffer.tobytes()
            except Exception as e:
                print(f"Frame Processing Error: {e}")
            
            time.sleep(0.01)

    async def get_video_stream(self):
        while self.running:
            with self.lock:
                frame = self.current_frame
            if frame:
                yield frame
            await asyncio.sleep(0.033)

    def update_gesture_config(self, gesture_id, config):
        if gesture_id in self.gesture_settings:
            for key, value in config.items():
                if key in self.gesture_settings[gesture_id]:
                    self.gesture_settings[gesture_id][key] = value
            return True
        return False

    def delete_gesture(self, gesture_id):
        if gesture_id in self.gesture_settings:
            self.gesture_settings[gesture_id]["enabled"] = False
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

    # --- ACTION EXECUTION ---
    def trigger_action(self, gesture_id, sub_action=None):
        if not self.gesture_settings[gesture_id]["enabled"]: return
        target_action = self.gesture_settings[gesture_id]["trigger"]
        if not target_action: return

        # Collision Check
        for key, config in self.gesture_settings.items():
            if config.get("trigger") == target_action:
                if key != gesture_id: return 
                break

        mapping = {
            "save_file": lambda: pyautogui.hotkey('ctrl', 's'),
            "refresh_page": lambda: pyautogui.press('f5'),
            "copy": lambda: pyautogui.hotkey('ctrl', 'c'),
            "paste": lambda: pyautogui.hotkey('ctrl', 'v'),
            "play_pause": lambda: pyautogui.press('playpause'),
            "next_track": lambda: pyautogui.press('nexttrack'),
            "prev_track": lambda: pyautogui.press('prevtrack'),
            "mute_audio": lambda: pyautogui.press('volumemute'),
            "show_desktop": lambda: pyautogui.hotkey('win', 'd'),
            "task_view": lambda: pyautogui.hotkey('win', 'tab'),
            "snap_left": lambda: pyautogui.hotkey('win', 'left'),
            "snap_right": lambda: pyautogui.hotkey('win', 'right'),
            "close_window": lambda: pyautogui.hotkey('alt', 'f4'),
            "volume_control": lambda: pyautogui.press(sub_action),
            "zoom_control": lambda: pyautogui.hotkey('ctrl', sub_action),
            "arrow_keys": lambda: self._execute_joystick(sub_action),
            
            # UPDATED: Use the helper method
            "screenshot": lambda: self.take_screenshot(),
            
            "undo_redo": lambda: pyautogui.hotkey('ctrl', sub_action),
            "switch_tabs": lambda: pyautogui.hotkey('ctrl', sub_action)
        }

        if target_action in mapping and self._check_cooldown(gesture_id):
            mapping[target_action]()
            print(f"Executed {target_action} via {gesture_id}")

    def _execute_joystick(self, direction):
        if direction and direction != "NONE":
            pyautogui.keyDown('shift')
            pyautogui.press(direction.lower())
            pyautogui.keyUp('shift')

    # --- CORE PROCESSING ---
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
        if handedness == "Right":
            fingers.append(1 if landmarks[4].x < landmarks[3].x else 0)
        else:
            fingers.append(1 if landmarks[4].x > landmarks[3].x else 0)
        for tip, pip in [(8,6), (12,10), (16,14), (20,18)]:
            fingers.append(1 if landmarks[tip].y < landmarks[pip].y else 0)
        return fingers

    def _process_frame(self, frame):
        frame = cv2.flip(frame, 1)  
        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self.detector.detect(mp_image)
        
        hands_data, handedness_list = [], []
        velocity_x, velocity_y = 0, 0

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
                
                if idx == 0:
                    palm_ids = [0,5,9,13,17]
                    raw_cx = int(np.mean([lm_list[i].x for i in palm_ids]) * w)
                    raw_cy = int(np.mean([lm_list[i].y for i in palm_ids]) * h)
                    if self.position_buffer:
                        prev_x, prev_y = self.position_buffer[-1]
                        cx = int(self.alpha * prev_x + (1-self.alpha) * raw_cx)
                        cy = int(self.alpha * prev_y + (1-self.alpha) * raw_cy)
                    else: cx, cy = raw_cx, raw_cy
                    self.position_buffer.append((cx,cy))
                    if len(self.position_buffer) >= 2:
                        velocity_x = self.position_buffer[-1][0] - self.position_buffer[-2][0]
                        velocity_y = self.position_buffer[-1][1] - self.position_buffer[-2][1]
        else: self.position_buffer.clear()

        # --- GESTURE TRIGGERS ---
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
            if current_hand != self.dominant_hand:
                snap_action = None
                if self.gesture_settings["snap"]["enabled"]:
                    frame, snap_action = self.pro_snap.process(frame, hands_data)
                    if snap_action == "RUN_CODE": self.trigger_action("snap")
                if snap_action is None and self.gesture_settings["volume"]["enabled"]:
                    frame, vol_percent = self.volume_control.process(frame, hand_wrapper, fingers, w, h)
                    if self.volume_control.volume_mode and abs(vol_percent - self.prev_volume) > 2:
                        sub = 'volumeup' if vol_percent > self.prev_volume else 'volumedown'
                        self.trigger_action("volume", sub)
                        self.prev_volume = vol_percent
            else:
                if self.gesture_settings["text_mode"]["enabled"]:
                    if fingers == [0,1,1,0,0]: self.peace_counter += 1
                    else: self.peace_counter = 0
                    if self.peace_counter == self.PEACE_HOLD_FRAMES:
                        self.text_mode_active = not self.text_mode_active
                        self.peace_counter = 0

                joystick_active = False
                if self.text_mode_active and self.gesture_settings["text_mode"]["enabled"]:
                    index_tip = hand_wrapper.landmark[8]
                    hx, hy = int(index_tip.x * w), int(index_tip.y * h)
                    direction, _ = compute_text_joystick(hx, hy, (w//2, h//2))
                    cv2.putText(frame, "TEXT MODE", (w-200,40), cv2.FONT_HERSHEY_SIMPLEX, 0.7,(0,255,0),2)
                    if direction != "NONE" and time.time() - self.last_joystick_time > self.gesture_settings["text_mode"]["cooldown"]:
                        key = {'UP': 'up', 'DOWN': 'down', 'LEFT': 'left', 'RIGHT': 'right'}.get(direction)
                        if key:
                            pyautogui.keyDown('shift'); pyautogui.press(key); pyautogui.keyUp('shift')
                            self.last_joystick_time = time.time()
                            joystick_active = True

                if not joystick_active and not self.text_mode_active:
                    # UPDATED: Split Copy & Paste Logic
                    if self.gesture_settings["copy"]["enabled"] or self.gesture_settings["paste"]["enabled"]:
                        frame, cp_action = self.copy_paste.process(frame, hands_data)
                        
                        if cp_action == "COPY" and self.gesture_settings["copy"]["enabled"]:
                            self.trigger_action("copy")
                        elif cp_action == "PASTE" and self.gesture_settings["paste"]["enabled"]:
                            self.trigger_action("paste")

                    ss_action = None
                    if self.gesture_settings["screenshot"]["enabled"]:
                        frame, ss_action = self.screenshot.process(frame, hands_data, velocity_y)
                        if ss_action == "SCREENSHOT": self.trigger_action("screenshot")

                    if ss_action is None:
                        index_tip = hand_wrapper.landmark[8]
                        hx, hy = int(index_tip.x * w), int(index_tip.y * h)
                        circular_cmd = None
                        if self.gesture_settings["circular"]["enabled"]:
                            circular_cmd = compute_circular_command(hx, hy, (w//2, h//2))
                            if circular_cmd in ["UNDO","REDO"]:
                                self.circular_display_text = circular_cmd
                                self.circular_display_timer = self.DISPLAY_FRAMES
                                sub = 'z' if circular_cmd == "UNDO" else 'y'
                                self.trigger_action("circular", sub)
                        if self.circular_display_timer <= 0 and self.gesture_settings["swipe"]["enabled"]:
                            frame, swipe_action = self.swipe_tabs.process(frame, hands_data, velocity_x)
                            if swipe_action == "NEXT_TAB": self.trigger_action("swipe", "tab")
                            elif swipe_action == "PREV_TAB": self.trigger_action("swipe", ["shift", "tab"])

        if self.circular_display_timer > 0 and self.circular_display_text:
            color = (0,0,255) if self.circular_display_text == "UNDO" else (0,255,0)
            cv2.putText(frame, self.circular_display_text, (w//2 - 100,100), cv2.FONT_HERSHEY_SIMPLEX, 1.5, color, 4)
            self.circular_display_timer -= 1

        return frame    