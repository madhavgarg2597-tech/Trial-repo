import numpy as np
import cv2
from collections import deque

class TwoHandZoom:
    def __init__(self):
        # State Management
        self.is_active = False
        self.anchor_dist = 0.0
        self.anchor_zoom = 100.0
        
        # Output values
        self.current_zoom = 100.0
        self.target_zoom = 100.0

        # Configuration
        self.min_zoom, self.max_zoom = 50, 300
        self.sensitivity = 1.5  # Multiplier for ratio-based zoom
        
        # Stability / Debounce
        self.presence_history = deque(maxlen=5)
        self.smooth_dist = None
        
        # Alpha filters (0.0 to 1.0)
        self.dist_alpha = 0.35 
        self.zoom_alpha = 0.20 # Lower = smoother/slower, Higher = snappier

    def _ema_filter(self, current, previous, alpha):
        if previous is None: return current
        return (alpha * current) + (1.0 - alpha) * previous

    def _get_palm_center(self, hand_landmarks, w, h):
        """Calculates center using a faster list comprehension than full numpy mean"""
        # Indices for palm: WRIST, INDEX_FINGER_MCP, PINKY_MCP
        indices = [0, 5, 17] 
        xs = [hand_landmarks.landmark[i].x for i in indices]
        ys = [hand_landmarks.landmark[i].y for i in indices]
        return (sum(xs) / 3 * w, sum(ys) / 3 * h)

    def process(self, frame, hands_data, w, h):
        # 1. Presence Check (Requires exactly 2 hands)
        is_detected = len(hands_data) == 2
        self.presence_history.append(is_detected)
        
        # 2. Early Exit if hands are lost (requires consensus over history)
        if sum(self.presence_history) < 3:
            self._reset_state()
            # Still interpolate current_zoom back to target or stay static
            self.current_zoom = self._ema_filter(self.target_zoom, self.current_zoom, self.zoom_alpha)
            return frame, int(self.current_zoom)

        # 3. Hand Data Unpacking
        (lm1, fingers1), (lm2, fingers2) = hands_data
        
        # Both hands must be open (gestures like 'pinch' can be added here)
        if not (all(fingers1) and all(fingers2)):
            self.is_active = False # Pause zooming but don't reset everything
            return frame, int(self.current_zoom)

        # 4. Calculate Distance
        p1 = self._get_palm_center(lm1, w, h)
        p2 = self._get_palm_center(lm2, w, h)
        
        raw_dist = np.hypot(p1[0] - p2[0], p1[1] - p2[1])
        self.smooth_dist = self._ema_filter(raw_dist, self.smooth_dist, self.dist_alpha)

        # 5. Zoom Logic
        if not self.is_active:
            # Set anchor point when gesture starts
            self.is_active = True
            self.anchor_dist = self.smooth_dist
            self.anchor_zoom = self.current_zoom
        else:
            # MULTIPLICATIVE ZOOM: (Current Dist / Start Dist)
            # This feels more natural, like pinching on a phone.
            ratio = self.smooth_dist / max(self.anchor_dist, 1.0)
            
            # Apply sensitivity to the growth rate
            adjusted_ratio = 1.0 + (ratio - 1.0) * self.sensitivity
            
            self.target_zoom = self.anchor_zoom * adjusted_ratio
            self.target_zoom = np.clip(self.target_zoom, self.min_zoom, self.max_zoom)

        # 6. Smooth the output
        self.current_zoom = self._ema_filter(self.target_zoom, self.current_zoom, self.zoom_alpha)

        # Visuals
        self._draw_ui(frame, p1, p2)

        return frame, int(self.current_zoom)

    def _reset_state(self):
        self.is_active = False
        self.smooth_dist = None

    def _draw_ui(self, frame, p1, p2):
        color = (0, 255, 0) if self.is_active else (0, 165, 255)

    # Draw line between palms
        cv2.line(frame, (int(p1[0]), int(p1[1])), (int(p2[0]), int(p2[1])), color, 2)
        cv2.circle(frame, (int(p1[0]), int(p1[1])), 6, color, -1)
        cv2.circle(frame, (int(p2[0]), int(p2[1])), 6, color, -1)

    # Zoom percentage
        cv2.putText(
        frame,
        f"ZOOM: {int(self.current_zoom)}%",
        (50, 50),
        cv2.FONT_HERSHEY_DUPLEX,
        1,
        color,
        2
    )

    # Zoom state indicator
        if self.is_active:
            cv2.putText(
            frame,
            "ZOOM MODE ACTIVE",
            (50, 85),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 0),
            2
            )
        else:
            cv2.putText(
            frame,
            "ZOOM READY",
            (50, 85),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 165, 255),
            2
        )
