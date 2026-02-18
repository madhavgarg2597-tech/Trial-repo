import numpy as np
import cv2


class VolumeControl:
    def __init__(self):
        self.volume_mode = False
        self.min_distance = 20
        self.max_distance = 200
        self.current_volume = 0

    def process(self, frame, hand_landmarks, fingers, w, h):
        """
        Returns:
            updated_frame, volume_percent
        """

        thumb_tip = hand_landmarks.landmark[4]
        index_tip = hand_landmarks.landmark[8]

        thumb_x, thumb_y = int(thumb_tip.x * w), int(thumb_tip.y * h)
        index_x, index_y = int(index_tip.x * w), int(index_tip.y * h)

        distance = np.sqrt(
            (thumb_x - index_x) ** 2 + (thumb_y - index_y) ** 2
        )

        thumb_up = fingers[0]
        index_up = fingers[1]
        middle_up = fingers[2]
        ring_up = fingers[3]
        pinky_up = fingers[4]

        pinch_condition = (
            thumb_up and index_up and not middle_up and not ring_up and not pinky_up
        )

        # Enter volume mode
        if pinch_condition and not self.volume_mode:
            self.volume_mode = True

        # Exit volume mode
        if not pinch_condition and self.volume_mode:
            self.volume_mode = False

        volume_percent = self.current_volume

        if self.volume_mode:
            cv2.line(frame, (thumb_x, thumb_y), (index_x, index_y), (255, 0, 255), 2)

            volume_percent = np.interp(
                distance,
                [self.min_distance, self.max_distance],
                [0, 100]
            )

            volume_percent = int(volume_percent)
            self.current_volume = volume_percent

            cv2.putText(
                frame,
                f"Volume: {volume_percent}%",
                (10, 130),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (255, 255, 0),
                2
            )

        return frame, volume_percent
