import cv2
import numpy as np
import math
import platform
import os
import time

SYSTEM_OS = platform.system()

class VolumeControl:
    def __init__(self):
        self.lock_time = 0
        self.cooldown_duration = 3.0 # 3 Second cooldown
        
    def set_system_volume(self, volume_percent):
        volume_percent = max(0, min(100, volume_percent))
        if SYSTEM_OS == "Darwin":
            try:
                cmd = f"osascript -e 'set volume output volume {int(volume_percent)}'"
                os.system(cmd)
            except: pass

    def process(self, frame, hand_wrapper, fingers, w, h):
        lm_list = hand_wrapper.landmark
        _, _, middle, ring, pinky = fingers
        current_time = time.time()
        
        # Check if we are currently in the 3-second cooldown
        if current_time - self.lock_time < self.cooldown_duration:
            cv2.putText(frame, "VOL: ON COOLDOWN", (50, 450), cv2.FONT_HERSHEY_COMPLEX, 0.7, (0, 165, 255), 2)
            return frame, None

        # If hand opens, trigger the cooldown
        if middle or ring or pinky:
            self.lock_time = current_time
            cv2.putText(frame, "VOL: LOCKED", (50, 450), cv2.FONT_HERSHEY_COMPLEX, 0.7, (0, 0, 255), 2)
            return frame, None 
        
        x1, y1 = int(lm_list[4].x * w), int(lm_list[4].y * h)
        x2, y2 = int(lm_list[8].x * w), int(lm_list[8].y * h)
        
        cv2.circle(frame, (x1, y1), 10, (255, 0, 255), cv2.FILLED)
        cv2.circle(frame, (x2, y2), 10, (255, 0, 255), cv2.FILLED)
        cv2.line(frame, (x1, y1), (x2, y2), (255, 0, 255), 3)

        length = math.hypot(x2 - x1, y2 - y1)

        # CHANGED: Max stretch is now 180 instead of 250 (Easier to hit 100%)
        vol_percent = np.interp(length, [30, 180], [0, 100])
        vol_bar = np.interp(length, [30, 180], [400, 150])

        smooth_vol = 5 * round(vol_percent / 5)
        self.set_system_volume(smooth_vol)

        cv2.rectangle(frame, (50, 150), (85, 400), (255, 0, 0), 3)
        cv2.rectangle(frame, (50, int(vol_bar)), (85, 400), (255, 0, 0), cv2.FILLED)
        cv2.putText(frame, f'{int(smooth_vol)} %', (40, 450), cv2.FONT_HERSHEY_COMPLEX, 1, (255, 0, 0), 3)

        return frame, smooth_vol