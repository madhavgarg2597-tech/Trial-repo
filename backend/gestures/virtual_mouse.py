import cv2
import mediapipe as mp
import pyautogui
import numpy as np
import time
import math

# --- PERFORMANCE CONFIG ---
pyautogui.PAUSE = 0
pyautogui.FAILSAFE = False

class VirtualMouse:
    def __init__(self):
        # --- TUNING ---
        self.PINCH_THRESHOLD = 30 
        self.RIGHT_PINCH_THRESHOLD = 50 # Generous range for middle finger
        self.drag_threshold_time = 0.4
        self.SCROLL_SENSITIVITY = 4
        
        # Smoothing (Increased from 5 to 7 for buttery movement)
        self.smooth = 7  
        # Safe zone padding (Reduced from 140 to 60 so you can reach the bottom easily!)
        self.frame_r = 60

        # --- STATE ---
        self.pinch_start_time = None
        self.prev_scroll_y = None
        self.plocX, self.plocY = 0, 0
        self.mouse_pressed = False
        self.w_scr, self.h_scr = pyautogui.size()

    def distance(self, p1, p2):
        return math.hypot(p1.x - p2.x, p1.y - p2.y)

    def is_finger_up(self, tip, pip):
        # Finger is UP if tip is higher (lower Y value) than the knuckle (pip)
        return tip.y < pip.y

    def process(self, frame, landmarks, hand_label, w, h):
        """
        Main processing loop for the Virtual Mouse.
        Returns: (frame, action_string)
        """
        lm = landmarks
        thumb_tip = lm[4]
        index_tip, index_pip = lm[8], lm[6]
        middle_tip, middle_pip = lm[12], lm[10]
        ring_tip, ring_pip = lm[16], lm[14]

        # --- FINGER STATES ---
        index_up = self.is_finger_up(index_tip, index_pip)
        middle_up = self.is_finger_up(middle_tip, middle_pip)
        ring_up = self.is_finger_up(ring_tip, ring_pip)

        gesture = "NONE"
        current_time = time.time()
        
        # Draw the "Safe Zone" Box
        cv2.rectangle(frame, (self.frame_r, self.frame_r), (w - self.frame_r, h - self.frame_r), (255, 0, 255), 2)

        # 1. SCROLL (Peace Sign + Ring Down)
        if index_up and middle_up and not ring_up:
            current_y = int(middle_tip.y * h)
            if self.prev_scroll_y is not None:
                dy = self.prev_scroll_y - current_y
                if abs(dy) > 10:
                    clicks = int(dy / self.SCROLL_SENSITIVITY)
                    pyautogui.scroll(clicks * 20, _pause=False)
                    gesture = "SCROLL"
            self.prev_scroll_y = current_y
            
            # Visuals
            cv2.circle(frame, (int(index_tip.x * w), int(index_tip.y * h)), 10, (0, 255, 255), -1)
            return frame, gesture
            
        else:
            self.prev_scroll_y = None

        # 2. RIGHT CLICK (Middle Finger + Thumb)
        # We check this BEFORE movement to prioritize clicks
        if middle_up:
            # Convert normalized distance to approximate pixels
            dist_right = self.distance(middle_tip, thumb_tip) * w 
            
            if dist_right < self.RIGHT_PINCH_THRESHOLD:
                 pyautogui.rightClick(_pause=False)
                 gesture = "RIGHT_CLICK"
                 # Small sleep to prevent double-click spam
                 time.sleep(0.3) 
                 
                 cv2.circle(frame, (int(middle_tip.x * w), int(middle_tip.y * h)), 10, (0, 0, 255), -1)
                 return frame, gesture

        # 3. LEFT CLICK / DRAG (Index Finger + Thumb)
        # Only if Index is UP
        if index_up:
            dist_left = self.distance(index_tip, thumb_tip) * w
            
            if dist_left < self.PINCH_THRESHOLD:
                if self.pinch_start_time is None:
                    self.pinch_start_time = current_time
                
                # Check Drag duration
                if current_time - self.pinch_start_time > self.drag_threshold_time:
                    if not self.mouse_pressed:
                        pyautogui.mouseDown(_pause=False)
                        self.mouse_pressed = True
                    gesture = "DRAG"
                    cv2.circle(frame, (int(index_tip.x * w), int(index_tip.y * h)), 10, (0, 0, 255), -1)
            else:
                # Released Pinch
                if self.pinch_start_time is not None:
                    duration = current_time - self.pinch_start_time
                    self.pinch_start_time = None
                    
                    if duration < self.drag_threshold_time:
                        pyautogui.click(_pause=False)
                        gesture = "LEFT_CLICK"
                        cv2.circle(frame, (int(index_tip.x * w), int(index_tip.y * h)), 10, (0, 255, 0), -1)
                    
                    elif self.mouse_pressed:
                        pyautogui.mouseUp(_pause=False)
                        self.mouse_pressed = False
                        gesture = "DRAG_END"

        # 4. MOVE CURSOR (Strict: Index Up, Ring Down)
        # This prevents "Fist" movement
        if gesture in ["NONE", "DRAG"] and index_up and not ring_up:
            
            # Map coordinates
            x1 = int(index_tip.x * w)
            y1 = int(index_tip.y * h)
            
            # Linear Interpolation
            x3 = np.interp(x1, (self.frame_r, w - self.frame_r), (0, self.w_scr))
            y3 = np.interp(y1, (self.frame_r, h - self.frame_r), (0, self.h_scr))
            
            # Smoothing
            curr_x = self.plocX + (x3 - self.plocX) / self.smooth
            curr_y = self.plocY + (y3 - self.plocY) / self.smooth
            
            # Move Mouse (MIRROR FIX)
            try:
                # Removed 'self.w_scr - curr_x' because the frame is already a mirror!
                pyautogui.moveTo(curr_x, curr_y, _pause=False)
            except:
                pass # Ignore edge cases
                
            self.plocX, self.plocY = curr_x, curr_y
            
            if gesture == "NONE": 
                gesture = "MOVE"
                cv2.circle(frame, (x1, y1), 8, (255, 0, 255), -1)

        return frame, gesture