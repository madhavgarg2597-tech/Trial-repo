import cv2
import time

class SwipeTabs:
    def __init__(self):
        # Configuration
        self.cooldown_time = 0.35  # Keep it snappy (Main Repo)
        self.last_trigger_time = 0
        self.velocity_threshold = 20  # Balanced threshold
        
    def process(self, frame, hands_data, velocity_x):
        # Only single hand allowed for swipe
        if len(hands_data) != 1:
            return frame, None

        hand_wrapper, fingers = hands_data[0]
        
        # Count active fingers to decide Mode
        # 4 Fingers = Tab Switch
        # 5 Fingers = App/Desktop Switch
        finger_count = sum(fingers)
        
        if finger_count < 4:
            return frame, None

        current_time = time.time()

        # Cooldown check
        if current_time - self.last_trigger_time < self.cooldown_time:
            return frame, None

        action = None

        # --- LOGIC ---
        # Right Swipe
        if velocity_x > self.velocity_threshold:
            if finger_count == 5:
                action = "NEXT_APP" # Switch Desktop/Space
            else:
                action = "NEXT_TAB" # Switch Browser Tab
            self.last_trigger_time = current_time

        # Left Swipe
        elif velocity_x < -self.velocity_threshold:
            if finger_count == 5:
                action = "PREV_APP"
            else:
                action = "PREV_TAB"
            self.last_trigger_time = current_time

        # --- UI FEEDBACK ---
        if action:
            # Green for Tabs, Orange for Apps
            color = (0, 255, 0) if "TAB" in action else (0, 165, 255)
            text = action.replace("_", " ")
            
            # Arrow indicator
            label = f"{text} >>" if "NEXT" in action else f"<< {text}"
            
            cv2.putText(frame, label, (50, 120), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 3)

        return frame, action