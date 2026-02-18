import cv2
import time

class SwipeTabs:
    def __init__(self):
        self.cooldown_time = 0.35  # Reduced from 1.0s (Makes it responsive)
        self.last_trigger_time = 0
        self.velocity_threshold = 15  # Reduced from 30 (Makes it sensitive)

    def process(self, frame, hands_data, velocity_x):
        # Only single hand allowed
        if len(hands_data) != 1:
            return frame, None

        hand_landmarks, fingers = hands_data[0]

        # Relaxed check: Allow 4 or 5 fingers (sometimes thumb is hidden)
        if sum(fingers) < 4:
            return frame, None

        current_time = time.time()

        # Cooldown check
        if current_time - self.last_trigger_time < self.cooldown_time:
            return frame, None

        action = None

        # Swipe Right (Next Tab)
        if velocity_x > self.velocity_threshold:
            action = "NEXT_TAB"
            self.last_trigger_time = current_time

        # Swipe Left (Prev Tab)
        elif velocity_x < -self.velocity_threshold:
            action = "PREV_TAB"
            self.last_trigger_time = current_time

        # UI Feedback
        if action:
            text = "Next Tab >>" if action == "NEXT_TAB" else "<< Prev Tab"
            cv2.putText(
                frame,
                text,
                (50, 120),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 255, 0),
                3
            )

        return frame, action