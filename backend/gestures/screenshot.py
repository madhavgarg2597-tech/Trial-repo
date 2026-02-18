import cv2
import time


class Screenshot:
    def __init__(self):
        self.cooldown = 1.5
        self.last_trigger_time = 0
        self.velocity_threshold = 35
        self.display_time = 0
        self.display_duration = 1.0

    def process(self, frame, hands_data, velocity_y):
        current_time = time.time()

        # ---------------- DISPLAY FEEDBACK ----------------
        if current_time - self.display_time < self.display_duration:
            cv2.putText(
                frame,
                "SCREENSHOT TAKEN",
                (50, 180),
                cv2.FONT_HERSHEY_DUPLEX,
                1,
                (0, 255, 0),
                2
            )

        # Must have exactly one hand
        if len(hands_data) != 1:
            return frame, None

        _, fingers = hands_data[0]

        # fingers = [Thumb, Index, Middle, Ring, Pinky]
        thumb, index, middle, ring, pinky = fingers

        # ✅ 4 fingers up, thumb down
        is_four_fingers = (not thumb) and index and middle and ring and pinky

        # Downward swipe (positive velocity_y because Y increases downward)
        if is_four_fingers and velocity_y > self.velocity_threshold:

            if current_time - self.last_trigger_time > self.cooldown:
                self.last_trigger_time = current_time
                self.display_time = current_time
                return frame, "SCREENSHOT"

        return frame, None
