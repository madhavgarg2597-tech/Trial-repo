import cv2
import mediapipe as mp
import numpy as np
import os
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

        # 3. ADVANCED SETTINGS (New Fields Added)
        # Each gesture now has: sensitivity (0.1-1.0), cooldown (seconds), trigger (key map ID)
        self.gesture_settings = {
            "volume": {
                "name": "Volume Control", 
                "enabled": True, 
                "sensitivity": 0.7, 
                "cooldown": 0.5, 
                "trigger": "volume_control",
                "description": "Pinch thumb and index to adjust volume."
            },
            "zoom": {
                "name": "Two-Hand Zoom", 
                "enabled": True, 
                "sensitivity": 0.8, 
                "cooldown": 0.2, 
                "trigger": "zoom_control",
                "description": "Move two hands apart to zoom in/out."
            },
            "swipe": {
                "name": "Swipe Tabs", 
                "enabled": True, 
                "sensitivity": 0.6, 
                "cooldown": 1.0, 
                "trigger": "switch_tabs",
                "description": "Swipe open hand left/right to switch tabs."
            },
            "snap": {
                "name": "Snap Action", 
                "enabled": True, 
                "sensitivity": 0.9, 
                "cooldown": 2.0, 
                "trigger": "snap_action",
                "description": "Snap fingers to trigger a shortcut."
            },
            "copy_paste": {
                "name": "Copy & Paste", 
                "enabled": True, 
                "sensitivity": 0.7, 
                "cooldown": 1.5, 
                "trigger": "clipboard_action",
                "description": "Pinch 3 fingers to copy, spread to paste."
            },
            "screenshot": {
                "name": "Screenshot", 
                "enabled": True, 
                "sensitivity": 0.8, 
                "cooldown": 3.0, 
                "trigger": "screenshot",
                "description": "Closed fist vertical movement to capture screen."
            },
            "text_mode": {
                "name": "Text Joystick", 
                "enabled": True, 
                "sensitivity": 0.5, 
                "cooldown": 0.5, 
                "trigger": "arrow_keys",
                "description": "Use index finger as a joystick for text selection."
            },
            "circular": {
                "name": "Undo/Redo Menu", 
                "enabled": True, 
                "sensitivity": 0.6, 
                "cooldown": 1.0, 
                "trigger": "undo_redo",
                "description": "Draw a circle to open the Undo/Redo menu."
            }
        }

        # 4. State Variables
        self.dominant_hand = "Right"
        self.position_buffer = deque(maxlen=20)
        self.alpha = 0.7
        self.prev_volume = 0
        self.prev_zoom = 100
        
        # Cooldown Trackers (New)
        self.last_triggered = {key: 0 for key in self.gesture_settings}

        # Text Mode
        self.text_mode_active = False 
        self.peace_counter = 0
        self.PEACE_HOLD_FRAMES = 15
        
        # Joystick
        self.last_joystick_time = 0
        self.JOYSTICK_COOLDOWN = 0.15
        
        # Circular Menu
        self.circular_display_text = None
        self.circular_display_timer = 0
        self.DISPLAY_FRAMES = 20

    def start(self):
        if self.running: return
        self.cap = cv2.VideoCapture(0)
        self.running = True
        print("Camera started.")

    def stop(self):
        self.running = False
        if self.cap:
            self.cap.release()
        print("Camera stopped.")

    def update_gesture_config(self, gesture_id, config):
        """Updates settings for a specific gesture"""
        if gesture_id in self.gesture_settings:
            # Update only provided keys
            for key, value in config.items():
                if key in self.gesture_settings[gesture_id]:
                    self.gesture_settings[gesture_id][key] = value
            print(f"Updated {gesture_id}: {config}")
            return True
        return False

    def delete_gesture(self, gesture_id):
        """'Deletes' a gesture by disabling and hiding it (Soft Delete)"""
        if gesture_id in self.gesture_settings:
            self.gesture_settings[gesture_id]["enabled"] = False
            # In a real app, you might remove it from the dict, 
            # but for safety we just disable it here.
            return True
        return False

    def _check_cooldown(self, gesture_id):
        """Returns True if cooldown has passed"""
        now = time.time()
        last = self.last_triggered.get(gesture_id, 0)
        cooldown = self.gesture_settings[gesture_id]["cooldown"]
        if now - last > cooldown:
            self.last_triggered[gesture_id] = now
            return True
        return False

    async def get_frame(self):
        while self.running:
            success, frame = self.cap.read()
            if not success:
                await asyncio.sleep(0.1)
                continue
            try:
                processed_frame = self._process_frame(frame)
            except Exception as e:
                # print(f"Engine Error: {e}")
                processed_frame = frame
            ret, buffer = cv2.imencode('.jpg', processed_frame)
            yield buffer.tobytes()
            await asyncio.sleep(0.01)

    # --- MAIN LOGIC ---
    def _process_frame(self, frame):
        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        
        result = self.detector.detect(mp_image)
        
        hands_data = []
        handedness_list = []
        velocity_x = 0
        velocity_y = 0

        # Detection & Velocity
        if result.hand_landmarks:
            for idx, lm_list in enumerate(result.hand_landmarks):
                self._draw_hand(frame, lm_list)
                raw_label = result.handedness[idx][0].category_name
                handedness = "Right" if raw_label == "Left" else "Left"
                handedness_list.append(handedness)
                
                class LandmarkWrapper:
                    def __init__(self, l): self.landmark = l
                wrapped = LandmarkWrapper(lm_list)
                fingers = self._get_finger_states(lm_list, handedness)
                hands_data.append((wrapped, fingers))
                
                if idx == 0:
                    palm_ids = [0,5,9,13,17]
                    cx = int(np.mean([lm_list[i].x for i in palm_ids]) * w)
                    cy = int(np.mean([lm_list[i].y for i in palm_ids]) * h)
                    
                    if len(self.position_buffer) > 0:
                        prev_x, prev_y = self.position_buffer[-1]
                        cx = int(self.alpha * prev_x + (1-self.alpha) * raw_cx)
                        cy = int(self.alpha * prev_y + (1-self.alpha) * raw_cy)
                    
                    self.position_buffer.append((cx,cy))
                    if len(self.position_buffer) >= 2:
                        velocity_x = self.position_buffer[-1][0] - self.position_buffer[-2][0]
                        velocity_y = self.position_buffer[-1][1] - self.position_buffer[-2][1]
        else:
            self.position_buffer.clear()


        # --- GESTURE EXECUTION (With Cooldowns & Sensitivity) ---
        
        # ZOOM
        if len(hands_data) == 2 and self.gesture_settings["zoom"]["enabled"]:
            self.position_buffer.clear()
            frame, zoom_val = self.two_hand_zoom.process(frame, hands_data, w, h)
            # Use Sensitivity as a multiplier for threshold? Or just raw logic.
            # For zoom, we use cooldown to prevent spamming
            if abs(zoom_val - self.prev_zoom) > 2:
                if self._check_cooldown("zoom"):
                    if zoom_val > self.prev_zoom: pyautogui.hotkey('ctrl', '+')
                    else: pyautogui.hotkey('ctrl', '-')
                self.prev_zoom = zoom_val

        # SINGLE HAND
        elif len(hands_data) == 1:
            hand_wrapper, fingers = hands_data[0]
            current_hand = handedness_list[0]

            # NON DOMINANT
            if current_hand != self.dominant_hand:
                
                # SNAP
                snap_action = None
                if self.gesture_settings["snap"]["enabled"]:
                    frame, snap_action = self.pro_snap.process(frame, hands_data)
                    if snap_action == "RUN_CODE" and self._check_cooldown("snap"):
                        pyautogui.press('win')
                
                # VOLUME
                if snap_action is None and self.gesture_settings["volume"]["enabled"]:
                    frame, vol_percent = self.volume_control.process(frame, hand_wrapper, fingers, w, h)
                    if self.volume_control.volume_mode:
                        if abs(vol_percent - self.prev_volume) > 2:
                            # Volume doesn't use cooldown usually, but we check enabled
                            if vol_percent > self.prev_volume: pyautogui.press('volumeup')
                            else: pyautogui.press('volumedown')
                            self.prev_volume = vol_percent

            # DOMINANT
            else:
                # TEXT MODE TOGGLE
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
                    center = (w//2, h//2)
                    direction, _ = compute_text_joystick(hx, hy, center)
                    cv2.putText(frame, "TEXT MODE", (w-200,40), cv2.FONT_HERSHEY_SIMPLEX, 0.7,(0,255,0),2)
                    
                    if direction != "NONE":
                        now = time.time()
                        if now - self.last_joystick_time > self.gesture_settings["text_mode"]["cooldown"]:
                            key_map = {'UP': 'up', 'DOWN': 'down', 'LEFT': 'left', 'RIGHT': 'right'}
                            arrow_key = key_map.get(direction)
                            if arrow_key:
                                pyautogui.keyDown('shift')
                                pyautogui.press(arrow_key)
                                pyautogui.keyUp('shift')
                                self.last_joystick_time = now
                                joystick_active = True

                if not joystick_active and not self.text_mode_active:
                    
                    # COPY / PASTE
                    cp_action = None
                    if self.gesture_settings["copy_paste"]["enabled"]:
                        frame, cp_action = self.copy_paste.process(frame, hands_data)
                        if cp_action and self._check_cooldown("copy_paste"):
                            if cp_action == "COPY": pyautogui.hotkey('ctrl', 'c')
                            elif cp_action == "PASTE": pyautogui.hotkey('ctrl', 'v')

                    # SCREENSHOT
                    ss_action = None
                    if cp_action is None and self.gesture_settings["screenshot"]["enabled"]:
                        # Use sensitivity to adjust velocity threshold if needed
                        thresh = 30 * (1.0 / self.gesture_settings["screenshot"]["sensitivity"])
                        # Pass this threshold to your screenshot module if it supports it
                        frame, ss_action = self.screenshot.process(frame, hands_data, velocity_y)
                        if ss_action == "SCREENSHOT" and self._check_cooldown("screenshot"):
                            pyautogui.screenshot(f"screenshot_{int(time.time())}.png")

                    # UNDO/REDO/SWIPE
                    if cp_action is None and ss_action is None:
                        index_tip = hand_wrapper.landmark[8]
                        hx, hy = int(index_tip.x * w), int(index_tip.y * h)
                        center = (w//2, h//2)
                        
                        circular_cmd = None
                        if self.gesture_settings["circular"]["enabled"]:
                            circular_cmd = compute_circular_command(hx, hy, center)
                            if circular_cmd in ["UNDO","REDO"]:
                                self.circular_display_text = circular_cmd
                                self.circular_display_timer = self.DISPLAY_FRAMES
                                if self._check_cooldown("circular"):
                                    if circular_cmd == "UNDO": pyautogui.hotkey('ctrl', 'z')
                                    elif circular_cmd == "REDO": pyautogui.hotkey('ctrl', 'y')
                        
                        if self.circular_display_timer <= 0 and self.gesture_settings["swipe"]["enabled"]:
                            frame, swipe_action = self.swipe_tabs.process(frame, hands_data, velocity_x)
                            if swipe_action and self._check_cooldown("swipe"):
                                if swipe_action == "NEXT_TAB": pyautogui.hotkey('ctrl', 'tab')
                                elif swipe_action == "PREV_TAB": pyautogui.hotkey('ctrl', 'shift', 'tab')

        # Overlay
        if self.circular_display_timer > 0 and self.circular_display_text:
            color = (0,0,255) if self.circular_display_text == "UNDO" else (0,255,0)
            cv2.putText(frame, self.circular_display_text, (w//2 - 100,100), cv2.FONT_HERSHEY_SIMPLEX, 1.5,color,4)
            self.circular_display_timer -= 1

        return frame

    def _draw_hand(self, image, landmarks):
        h, w, _ = image.shape
        # Simple drawing
        for lm in landmarks:
            cv2.circle(image, (int(lm.x*w), int(lm.y*h)), 4, (0,0,255), -1)
    
    def _get_finger_states(self, landmarks, handedness):
        fingers = []
        if handedness == "Right": fingers.append(1 if landmarks[4].x < landmarks[3].x else 0)
        else: fingers.append(1 if landmarks[4].x > landmarks[3].x else 0)
        for tip, pip in [(8, 6), (12, 10), (16, 14), (20, 18)]:
            fingers.append(1 if landmarks[tip].y < landmarks[pip].y else 0)
        return fingers