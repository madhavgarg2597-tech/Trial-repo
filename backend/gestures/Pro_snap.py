import cv2
import time
import numpy as np
from collections import deque

class ProSnap:
    def __init__(self):
        self.dist_history = deque(maxlen=4)
        self.smooth_dist = None
        self.alpha = 0.4  
        self.is_prepped = False
        self.last_trigger_time = 0
        self.cooldown = 1.5
        self.display_time = 0
        self.banner_duration = 0.8  
        self.touch_dist = 0.05        
        self.snap_velocity = 0.08     
        self.reset_distance = 0.25    

    def _ema(self, current, previous):
        if previous is None: return current
        return self.alpha * current + (1 - self.alpha) * previous

    def process(self, frame, hands_data):
        current_time = time.time()

        if len(hands_data) != 1:
            self.is_prepped = False
            self.dist_history.clear()
            return frame, None

        # UNPACK BOTH LANDMARKS AND FINGERS
        landmarks, fingers = hands_data[0]
        thumb, index, middle, ring, pinky = fingers

        # --- THE DEADBOLT ---
        # If ring or pinky is up, it's NOT a snap (prevents stealing Copy/Paste & Screenshot)
        if ring or pinky:
            self.is_prepped = False
            self.dist_history.clear()
            return frame, None

        t_lm = landmarks.landmark[4]
        m_lm = landmarks.landmark[12]

        raw_dist = np.linalg.norm([t_lm.x - m_lm.x, t_lm.y - m_lm.y, t_lm.z - m_lm.z])
        self.smooth_dist = self._ema(raw_dist, self.smooth_dist)
        dist = self.smooth_dist
        self.dist_history.append(dist)

        # PREP STATE
        if dist < self.touch_dist:
            self.is_prepped = True
            cv2.circle(frame, (int(t_lm.x * frame.shape[1]), int(t_lm.y * frame.shape[0])), 20, (0, 255, 255), 2)

        # SNAP DETECTION
        if self.is_prepped and len(self.dist_history) == 4:
            velocity = self.dist_history[-1] - self.dist_history[0]
            if velocity > self.snap_velocity:
                if current_time - self.last_trigger_time > self.cooldown:
                    self.last_trigger_time = current_time
                    self.display_time = current_time
                    self.is_prepped = False
                    self.dist_history.clear()
                    return frame, "RUN_CODE"

        if dist > self.reset_distance:
            self.is_prepped = False

        # BANNER
        if current_time - self.display_time < self.banner_duration:
            cv2.putText(frame, "SNAP EXECUTED!", (frame.shape[1] // 3, 50), cv2.FONT_HERSHEY_DUPLEX, 1.2, (0, 255, 0), 2)

        return frame, None