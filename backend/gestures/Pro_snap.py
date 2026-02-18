import cv2
import time
import numpy as np
from collections import deque


class ProSnap:
    def __init__(self):

        # Distance tracking
        self.dist_history = deque(maxlen=4)
        self.smooth_dist = None
        self.alpha = 0.4  # Distance smoothing

        # Snap state
        self.is_prepped = False
        self.last_trigger_time = 0
        self.cooldown = 1.5

        # Visual banner state
        self.display_time = 0
        self.banner_duration = 0.8  # seconds

        # Thresholds
        self.touch_dist = 0.05        # Touch detection threshold
        self.snap_velocity = 0.08     # Required separation velocity
        self.reset_distance = 0.25    # Reset if fingers too far apart

    # ---------------- EMA FILTER ----------------
    def _ema(self, current, previous):
        if previous is None:
            return current
        return self.alpha * current + (1 - self.alpha) * previous

    # ---------------- MAIN PROCESS ----------------
    def process(self, frame, hands_data):

        current_time = time.time()

        # Require exactly one hand
        if len(hands_data) != 1:
            self.is_prepped = False
            self.dist_history.clear()
            return frame, None

        landmarks, _ = hands_data[0]

        thumb = landmarks.landmark[4]
        middle = landmarks.landmark[12]

        # 3D normalized distance
        raw_dist = np.linalg.norm([
            thumb.x - middle.x,
            thumb.y - middle.y,
            thumb.z - middle.z
        ])

        # Smooth distance
        self.smooth_dist = self._ema(raw_dist, self.smooth_dist)
        dist = self.smooth_dist

        self.dist_history.append(dist)

        # ---------------- PREP STATE ----------------
        if dist < self.touch_dist:
            self.is_prepped = True

            # Yellow ring indicates snap loaded
            cv2.circle(
                frame,
                (int(thumb.x * frame.shape[1]), int(thumb.y * frame.shape[0])),
                20,
                (0, 255, 255),
                2
            )

        # ---------------- SNAP DETECTION ----------------
        if self.is_prepped and len(self.dist_history) == 4:

            velocity = self.dist_history[-1] - self.dist_history[0]

            if velocity > self.snap_velocity:

                if current_time - self.last_trigger_time > self.cooldown:
                    self.last_trigger_time = current_time
                    self.display_time = current_time
                    self.is_prepped = False
                    self.dist_history.clear()

                    return frame, "RUN_CODE"

        # Reset prep if fingers slowly separate too much
        if dist > self.reset_distance:
            self.is_prepped = False

        # ---------------- DISPLAY BANNER ----------------
        if current_time - self.display_time < self.banner_duration:

            alpha = 1 - ((current_time - self.display_time) / self.banner_duration)

            overlay = frame.copy()

            # Top banner
            cv2.rectangle(
                overlay,
                (0, 0),
                (frame.shape[1], 80),
                (0, 0, 0),
                -1
            )

            cv2.putText(
                overlay,
                "CODE RUNNING...",
                (frame.shape[1] // 3, 50),
                cv2.FONT_HERSHEY_DUPLEX,
                1.2,
                (0, 255, 0),
                2
            )

            frame = cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0)

        return frame, None
