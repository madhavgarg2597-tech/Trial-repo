import cv2
import time

class SwipeTabs:
    def __init__(self):
        self.cooldown_time = 0.5  
        self.last_trigger_time = 0
        self.velocity_threshold = 15  

    def process(self, frame, hands_data, velocity_x):
        if len(hands_data) != 1:
            return frame, None

        hand_landmarks, fingers = hands_data[0]
        finger_count = sum(fingers)

        # Must be exactly 4 or 5 fingers
        if finger_count < 4:
            return frame, None

        current_time = time.time()
        if current_time - self.last_trigger_time < self.cooldown_time:
            return frame, None

        action = None

        if velocity_x > self.velocity_threshold:
            action = "NEXT_APP" if finger_count == 5 else "NEXT_TAB"
            self.last_trigger_time = current_time

        elif velocity_x < -self.velocity_threshold:
            action = "PREV_APP" if finger_count == 5 else "PREV_TAB"
            self.last_trigger_time = current_time

        if action:
            text = f"{action} >>" if "NEXT" in action else f"<< {action}"
            cv2.putText(frame, text, (50, 120), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)

        return frame, action