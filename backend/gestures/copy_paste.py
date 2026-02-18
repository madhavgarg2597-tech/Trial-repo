import cv2
import time
import numpy as np


class CopyPaste:
    def __init__(self):

        self.anchor_dist = None
        self.last_trigger_time = 0
        self.cooldown = 1.0

        self.trigger_threshold = 0.04
        self.alpha = 0.4
        self.smooth_dist = None

        # Display state
        self.display_text = None
        self.display_time = 0
        self.display_duration = 0.8  # seconds

    def _ema(self, current, previous):
        if previous is None:
            return current
        return self.alpha * current + (1 - self.alpha) * previous

    def process(self, frame, hands_data):

        current_time = time.time()

        # ---------------- DISPLAY HOLD ----------------
        if self.display_text and (current_time - self.display_time < self.display_duration):

            cv2.putText(
                frame,
                self.display_text,
                (50, 140),
                cv2.FONT_HERSHEY_DUPLEX,
                1,
                (0, 255, 255),
                2
            )
        else:
            self.display_text = None

        # ---------------- HAND CHECK ----------------
        if len(hands_data) != 1:
            self.anchor_dist = None
            return frame, None

        landmarks, fingers = hands_data[0]

        thumb, index, middle, ring, pinky = fingers

        if not (thumb and index and middle and not ring and not pinky):
            self.anchor_dist = None
            return frame, None

        t = landmarks.landmark[4]
        i = landmarks.landmark[8]
        m = landmarks.landmark[12]

        dist1 = np.linalg.norm([t.x - i.x, t.y - i.y, t.z - i.z])
        dist2 = np.linalg.norm([t.x - m.x, t.y - m.y, t.z - m.z])

        raw_dist = (dist1 + dist2) / 2
        self.smooth_dist = self._ema(raw_dist, self.smooth_dist)
        dist = self.smooth_dist

        # ---------------- ANCHOR SET ----------------
        if self.anchor_dist is None:
            self.anchor_dist = dist
            return frame, None

        if current_time - self.last_trigger_time < self.cooldown:
            return frame, None

        diff = dist - self.anchor_dist

        # COPY (pinch inward)
        if diff < -self.trigger_threshold:
            self.last_trigger_time = current_time
            self.anchor_dist = None
            self.display_text = "COPY"
            self.display_time = current_time
            return frame, "COPY"

        # PASTE (spread outward)
        if diff > self.trigger_threshold:
            self.last_trigger_time = current_time
            self.anchor_dist = None
            self.display_text = "PASTE"
            self.display_time = current_time
            return frame, "PASTE"

        return frame, None
