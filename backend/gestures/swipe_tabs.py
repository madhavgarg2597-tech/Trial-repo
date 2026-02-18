import cv2
import time


class SwipeTabs:
    def __init__(self):
        self.cooldown_time = 1.0  # seconds
        self.last_trigger_time = 0
        self.velocity_threshold = 30  # horizontal speed threshold

    def process(self, frame, hands_data, velocity_x):

        # Only single hand allowed
        if len(hands_data) != 1:
            return frame, None

        hand_landmarks, fingers = hands_data[0]

        # Require open palm
        if not all(fingers):
            return frame, None

        current_time = time.time()

        # Cooldown check
        if current_time - self.last_trigger_time < self.cooldown_time:
            return frame, None

        action = None

        # Swipe Right
        if velocity_x > self.velocity_threshold:
            action = "NEXT_TAB"
            self.last_trigger_time = current_time

        # Swipe Left
        elif velocity_x < -self.velocity_threshold:
            action = "PREV_TAB"
            self.last_trigger_time = current_time

        # UI Feedback
        if action:
            cv2.putText(
                frame,
                action,
                (50, 120),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 255, 0),
                3
            )

        return frame, action
