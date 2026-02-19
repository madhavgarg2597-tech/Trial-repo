import cv2
import numpy as np
import math
import platform
import os

# --- CROSS-PLATFORM SETUP ---
# Detect the OS (Darwin = Mac, Windows = Windows)
SYSTEM_OS = platform.system()

# Windows Imports (Only load if we are actually on Windows)
if SYSTEM_OS == "Windows":
    try:
        from comtypes import CLSCTX_ALL
        from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
    except ImportError:
        pass # We ignore this error on Mac

class VolumeControl:
    def __init__(self):
        self.volume_mode = True
        self.min_vol = 0
        self.max_vol = 100
        
        # Windows Audio Interface Setup
        self.interface = None
        self.volume_object = None
        
        if SYSTEM_OS == "Windows":
            try:
                devices = AudioUtilities.GetSpeakers()
                self.interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
                self.volume_object = self.interface.QueryInterface(IAudioEndpointVolume)
            except:
                self.interface = None

    def set_system_volume(self, volume_percent):
        """Sets volume for both Mac and Windows"""
        # Clamp value between 0 and 100
        volume_percent = max(0, min(100, volume_percent))
        
        if SYSTEM_OS == "Windows" and self.volume_object:
            try:
                # Windows uses a scalar from 0.0 to 1.0
                self.volume_object.SetMasterVolumeLevelScalar(volume_percent / 100, None)
            except: pass
            
        elif SYSTEM_OS == "Darwin": # MacOS
            # Mac uses AppleScript to set volume (0 to 100)
            try:
                # 'osascript' is the built-in Mac command line tool
                cmd = f"osascript -e 'set volume output volume {int(volume_percent)}'"
                os.system(cmd)
            except: pass

    def process(self, frame, hand_wrapper, fingers, w, h):
        # landmarks unpacking
        lm_list = hand_wrapper.landmark
        
        # fingers = [Thumb, Index, Middle, Ring, Pinky]
        # NEW SAFETY CHECK: 
        # Only adjust volume if Middle, Ring, and Pinky are CLOSED.
        # This prevents the 'Open Palm' slip you mentioned.
        _, _, middle, ring, pinky = fingers
        
        if middle or ring or pinky:
            # Display 'Locked' UI so you know why it's not moving
            cv2.putText(frame, "VOL LOCKED (Open Hand)", (50, 450), 
                        cv2.FONT_HERSHEY_COMPLEX, 0.7, (0, 0, 255), 2)
            return frame, None # Do nothing
        
        # Thumb tip (4) and Index tip (8)
        x1, y1 = int(lm_list[4].x * w), int(lm_list[4].y * h)
        x2, y2 = int(lm_list[8].x * w), int(lm_list[8].y * h)
        cx, cy = (x1 + x2) // 2, (y1 + y2) // 2

        # Draw Visuals (Thumb and Index)
        cv2.circle(frame, (x1, y1), 10, (255, 0, 255), cv2.FILLED)
        cv2.circle(frame, (x2, y2), 10, (255, 0, 255), cv2.FILLED)
        cv2.line(frame, (x1, y1), (x2, y2), (255, 0, 255), 3)

        # Calculate Distance between fingers
        length = math.hypot(x2 - x1, y2 - y1)

        # Map Distance to Volume (Interpolation)
        # 30px distance = 0% volume, 250px distance = 100% volume
        vol_percent = np.interp(length, [30, 250], [0, 100])
        
        # UI Bar Height calculation
        vol_bar = np.interp(length, [30, 250], [400, 150])

        # Smoothness: Round to nearest 5 to prevent jitter
        smooth_vol = 5 * round(vol_percent / 5)

        # Apply Volume to System
        self.set_system_volume(smooth_vol)

        # Draw Volume Bar on Screen
        cv2.rectangle(frame, (50, 150), (85, 400), (255, 0, 0), 3)
        cv2.rectangle(frame, (50, int(vol_bar)), (85, 400), (255, 0, 0), cv2.FILLED)
        cv2.putText(frame, f'{int(smooth_vol)} %', (40, 450), cv2.FONT_HERSHEY_COMPLEX, 1, (255, 0, 0), 3)

        return frame, smooth_vol