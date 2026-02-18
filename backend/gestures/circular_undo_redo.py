import math
from collections import deque

ANGLE_HISTORY = 20
ROTATION_THRESHOLD = 220     # require larger rotation (~60% circle)
MIN_RADIUS = 60              # finger must move far from center

angle_buffer = deque(maxlen=ANGLE_HISTORY)


def compute_circular_command(hx, hy, center):
    dx = hx - center[0]
    dy = hy - center[1]

    radius = math.sqrt(dx*dx + dy*dy)

    # Require minimum circle size
    if radius < MIN_RADIUS:
        angle_buffer.clear()
        return "NONE"

    angle = math.degrees(math.atan2(dy, dx))
    angle_buffer.append(angle)

    if len(angle_buffer) < ANGLE_HISTORY:
        return "NONE"

    total_rotation = 0

    for i in range(1, len(angle_buffer)):
        diff = angle_buffer[i] - angle_buffer[i - 1]

        if diff > 180:
            diff -= 360
        elif diff < -180:
            diff += 360

        # Ignore micro jitter
        if abs(diff) < 2:
            continue

        total_rotation += diff

    if abs(total_rotation) < ROTATION_THRESHOLD:
        return "NONE"

    angle_buffer.clear()

    # direction corrected earlier
    if total_rotation > 0:
        return "REDO"
    else:
        return "UNDO"
