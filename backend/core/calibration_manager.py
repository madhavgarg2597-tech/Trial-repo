import numpy as np
import time
import json
import os

class CalibrationManager:
    def __init__(self):
        self.is_active = False
        self.current_task_idx = 0
        self.progress = 0  # 0 to 100 for the active task
        self.collected_data = {} # {task_id: [landmarks]}
        self.status = "waiting" # waiting, scanning, error, success
        
        self.tasks = [
            {"id": 0, "name": "Center", "desc": "Hold still in center"},
            {"id": 1, "name": "Left", "desc": "Tilt hand left"},
            {"id": 2, "name": "Right", "desc": "Tilt hand right"},
            {"id": 3, "name": "Close", "desc": "Move closer"},
            {"id": 4, "name": "Far", "desc": "Move further away"}
        ]

    def start_session(self, gesture_name):
        self.is_active = True
        self.gesture_name = gesture_name
        self.current_task_idx = 0
        self.progress = 0
        self.collected_data = {i: [] for i in range(len(self.tasks))}
        self.status = "scanning"

    def process_landmarks(self, landmarks):
        """
        Logic to check if landmarks match the current task requirements.
        landmarks: MediaPipe hand landmarks (21 points)
        """
        if not self.is_active or self.status == "success":
            return

        # Simple validation logic for the 'Apple Magic' feel
        # You can expand these with actual coordinate math
        valid_pose = self._validate_spatial_pose(landmarks)
        
        if valid_pose:
            self.status = "scanning"
            self.progress += 2 # Increment progress per valid frame
            
            # Store the 21-point mesh data
            frame_data = [[lm.x, lm.y, lm.z] for lm in landmarks]
            self.collected_data[self.current_task_idx].append(frame_data)
            
            if self.progress >= 100:
                self.progress = 100
                self.status = "success"
        else:
            self.status = "error" # This triggers the RED ring in your UI

    def next_task(self):
        if self.current_task_idx < len(self.tasks) - 1:
            self.current_task_idx += 1
            self.progress = 0
            self.status = "scanning"
            return True
        return False

    def _validate_spatial_pose(self, landmarks):
        # Example: Check if wrist (lm 0) is roughly in center for Task 0
        wrist = landmarks[0]
        if self.current_task_idx == 0: # Center
            return 0.3 < wrist.x < 0.7 and 0.3 < wrist.y < 0.7
        # Add Left/Right tilt checks using landmarks 0, 5, and 17
        return True

    def get_ui_state(self):
        return {
            "task_idx": self.current_task_idx,
            "progress": self.progress,
            "status": self.status,
            "desc": self.tasks[self.current_task_idx]["desc"]
        }