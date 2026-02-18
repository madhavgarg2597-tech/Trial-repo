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
            "volume": {"name": "Volume Control", "enabled": True},
            "zoom": {"name": "Two-Hand Zoom", "enabled": True},
            "swipe": {"name": "Swipe Tabs", "enabled": True},
            "snap": {"name": "Snap Action", "enabled": True},
            "copy_paste": {"name": "Copy & Paste", "enabled": True},
            "screenshot": {"name": "Screenshot", "enabled": True},
            "text_mode": {"name": "Text Joystick", "enabled": True},
            "circular": {"name": "Undo/Redo Menu", "enabled": True}
        }

        # 4. State Variables
        self.dominant_hand = "Right"
        self.position_buffer = deque(maxlen=20)
        self.alpha = 0.7
        
        self.prev_volume = 0
        self.prev_zoom = 100
        
        # Text Mode State
        self.text_mode_active = False 
        self.peace_counter = 0
        self.PEACE_HOLD_FRAMES = 15
        
        # Joystick State
        self.last_joystick_time = 0
        self.JOYSTICK_COOLDOWN = 0.15
        
        # Circular Menu State
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

    def set_gesture_active(self, gesture_key, is_active):
        if gesture_key in self.gesture_settings:
            self.gesture_settings[gesture_key]["enabled"] = is_active
            print(f"Configuration Update: {gesture_key} -> {is_active}")

    async def get_frame(self):
        while self.running:
            success, frame = self.cap.read()
            if not success:
                await asyncio.sleep(0.1)
                continue
            try:
                processed_frame = self._process_frame(frame)
            except Exception as e:
                print(f"Engine Error: {e}")
                processed_frame = frame
            ret, buffer = cv2.imencode('.jpg', processed_frame)
            yield buffer.tobytes()
            await asyncio.sleep(0.01)

    # --- HELPERS ---
    def _draw_hand(self, image, landmarks):
        h, w, _ = image.shape
        HAND_CONNECTIONS = [
            (0,1),(1,2),(2,3),(3,4),(0,5),(5,6),(6,7),(7,8),
            (5,9),(9,10),(10,11),(11,12),(9,13),(13,14),(14,15),(15,16),
            (13,17),(17,18),(18,19),(19,20),(0,17)
        ]
        for connection in HAND_CONNECTIONS:
            start, end = connection
            start_pt = (int(landmarks[start].x * w), int(landmarks[start].y * h))
            end_pt = (int(landmarks[end].x * w), int(landmarks[end].y * h))
            cv2.line(image, start_pt, end_pt, (255,255,255), 2)
        for lm in landmarks:
            cx, cy = int(lm.x * w), int(lm.y * h)
            cv2.circle(image, (cx,cy), 4, (0,0,255), -1)

    def _get_finger_states(self, landmarks, handedness):
        fingers = []
        # Update Logic: Thumb comparison depends on hand side
        if handedness == "Right":
            # For Right hand (palm facing camera): Thumb is to the LEFT of index finger
            fingers.append(1 if landmarks[4].x < landmarks[3].x else 0)
        else:
            # For Left hand: Thumb is to the RIGHT of index finger
            fingers.append(1 if landmarks[4].x > landmarks[3].x else 0)

        fingers.append(1 if landmarks[8].y < landmarks[6].y else 0)
        fingers.append(1 if landmarks[12].y < landmarks[10].y else 0)
        fingers.append(1 if landmarks[16].y < landmarks[14].y else 0)
        fingers.append(1 if landmarks[20].y < landmarks[18].y else 0)
        return fingers

    # --- MAIN LOGIC ---
    def _process_frame(self, frame):
        # ---------------------------------------------------------
        # 1. REMOVED THE FLIP: Standard Webcam View
        # frame = cv2.flip(frame, 1)  <-- This line caused the mirror effect
        # ---------------------------------------------------------
        
        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        
        result = self.detector.detect(mp_image)
        
        hands_data = []
        handedness_list = []
        velocity_x = 0
        velocity_y = 0

        # Detection
        if result.hand_landmarks:
            for idx, lm_list in enumerate(result.hand_landmarks):
                self._draw_hand(frame, lm_list)
                
                # UPDATED: Handedness Logic for Non-Mirrored View
                raw_label = result.handedness[idx][0].category_name
                # In standard view, MediaPipe usually gets it right directly
                handedness = raw_label 
                
                handedness_list.append(handedness)

                class LandmarkWrapper:
                    def __init__(self, l): self.landmark = l
                wrapped = LandmarkWrapper(lm_list)
                
                fingers = self._get_finger_states(lm_list, handedness)
                hands_data.append((wrapped, fingers))
                
                # Velocity (Center of palm)
                if idx == 0:
                    palm_ids = [0,5,9,13,17]
                    raw_cx = int(np.mean([lm_list[i].x for i in palm_ids]) * w)
                    raw_cy = int(np.mean([lm_list[i].y for i in palm_ids]) * h)

                    if len(self.position_buffer) > 0:
                        prev_x, prev_y = self.position_buffer[-1]
                        cx = int(self.alpha * prev_x + (1-self.alpha) * raw_cx)
                        cy = int(self.alpha * prev_y + (1-self.alpha) * raw_cy)
                    else:
                        cx, cy = raw_cx, raw_cy
                    self.position_buffer.append((cx,cy))
                    if len(self.position_buffer) >= 2:
                        velocity_x = self.position_buffer[-1][0] - self.position_buffer[-2][0]
                        velocity_y = self.position_buffer[-1][1] - self.position_buffer[-2][1]
        else:
            self.position_buffer.clear()


        # 2. Gesture Logic
        
        # --- TWO HAND ZOOM ---
        if len(hands_data) == 2 and self.gesture_settings["zoom"]["enabled"]:
            self.position_buffer.clear()
            frame, zoom_val = self.two_hand_zoom.process(frame, hands_data, w, h)
            if abs(zoom_val - self.prev_zoom) > 2:
                if zoom_val > self.prev_zoom: pyautogui.hotkey('ctrl', '+')
                else: pyautogui.hotkey('ctrl', '-')
                self.prev_zoom = zoom_val

        # --- SINGLE HAND ---
        elif len(hands_data) == 1:
            hand_landmarks_wrapper, fingers = hands_data[0]
            current_hand = handedness_list[0]

            # -------- NON DOMINANT HAND --------
            if current_hand != self.dominant_hand:
                
                # SNAP
                snap_action = None
                if self.gesture_settings["snap"]["enabled"]:
                    frame, snap_action = self.pro_snap.process(frame, hands_data)
                    if snap_action == "RUN_CODE": pyautogui.press('win')
                
                # VOLUME
                if snap_action is None and self.gesture_settings["volume"]["enabled"]:
                    frame, vol_percent = self.volume_control.process(frame, hand_landmarks_wrapper, fingers, w, h)
                    if self.volume_control.volume_mode:
                        if abs(vol_percent - self.prev_volume) > 2:
                            if vol_percent > self.prev_volume: pyautogui.press('volumeup')
                            else: pyautogui.press('volumedown')
                            self.prev_volume = vol_percent

            # -------- DOMINANT HAND --------
            else:
                if self.gesture_settings["text_mode"]["enabled"]:
                    if fingers == [0,1,1,0,0]: self.peace_counter += 1
                    else: self.peace_counter = 0

                    if self.peace_counter == self.PEACE_HOLD_FRAMES:
                        self.text_mode_active = not self.text_mode_active
                        self.peace_counter = 0

                joystick_active = False

                # TEXT MODE
                if self.text_mode_active and self.gesture_settings["text_mode"]["enabled"]:
                    index_tip = hand_landmarks_wrapper.landmark[8]
                    hx, hy = int(index_tip.x * w), int(index_tip.y * h)
                    center = (w//2, h//2)
                    direction, _ = compute_text_joystick(hx, hy, center)
                    cv2.putText(frame, "TEXT MODE", (w-200,40), cv2.FONT_HERSHEY_SIMPLEX, 0.7,(0,255,0),2)
                    
                    if direction != "NONE":
                        now = time.time()
                        if now - self.last_joystick_time > self.JOYSTICK_COOLDOWN:
                            key_map = {'UP': 'up', 'DOWN': 'down', 'LEFT': 'left', 'RIGHT': 'right'}
                            arrow_key = key_map.get(direction)
                            if arrow_key:
                                pyautogui.keyDown('shift')
                                pyautogui.press(arrow_key)
                                pyautogui.keyUp('shift')
                                self.last_joystick_time = now
                                joystick_active = True

                # NORMAL MODE
                if not joystick_active and not self.text_mode_active:
                    
                    # COPY / PASTE
                    cp_action = None
                    if self.gesture_settings["copy_paste"]["enabled"]:
                        frame, cp_action = self.copy_paste.process(frame, hands_data)
                        if cp_action == "COPY": pyautogui.hotkey('ctrl', 'c')
                        elif cp_action == "PASTE": pyautogui.hotkey('ctrl', 'v')

                    # SCREENSHOT
                    ss_action = None
                    if cp_action is None and self.gesture_settings["screenshot"]["enabled"]:
                        frame, ss_action = self.screenshot.process(frame, hands_data, velocity_y)
                        if ss_action == "SCREENSHOT": pyautogui.screenshot(f"screenshot_{int(time.time())}.png")

                    # UNDO/REDO/SWIPE
                    if cp_action is None and ss_action is None:
                        index_tip = hand_landmarks_wrapper.landmark[8]
                        hx, hy = int(index_tip.x * w), int(index_tip.y * h)
                        center = (w//2, h//2)
                        
                        circular_cmd = None
                        if self.gesture_settings["circular"]["enabled"]:
                            circular_cmd = compute_circular_command(hx, hy, center)
                            if circular_cmd in ["UNDO","REDO"]:
                                self.circular_display_text = circular_cmd
                                self.circular_display_timer = self.DISPLAY_FRAMES
                                if circular_cmd == "UNDO": pyautogui.hotkey('ctrl', 'z')
                                elif circular_cmd == "REDO": pyautogui.hotkey('ctrl', 'y')
                        
                        if self.circular_display_timer <= 0 and self.gesture_settings["swipe"]["enabled"]:
                            frame, swipe_action = self.swipe_tabs.process(frame, hands_data, velocity_x)
                            if swipe_action == "NEXT_TAB": pyautogui.hotkey('ctrl', 'tab')
                            elif swipe_action == "PREV_TAB": pyautogui.hotkey('ctrl', 'shift', 'tab')

        # 3. Overlay
        if self.circular_display_timer > 0 and self.circular_display_text:
            color = (0,0,255) if self.circular_display_text == "UNDO" else (0,255,0)
            cv2.putText(frame, self.circular_display_text, (w//2 - 100,100), cv2.FONT_HERSHEY_SIMPLEX, 1.5,color,4)
            self.circular_display_timer -= 1

        return frame