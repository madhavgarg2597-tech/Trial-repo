import math

DEAD_ZONE = 30
MAX_RADIUS = 120

def compute_text_joystick(hx, hy, center):
    dx = hx - center[0]
    dy = hy - center[1]

    dist = min(math.sqrt(dx*dx + dy*dy), MAX_RADIUS)

    if dist < DEAD_ZONE:
        return "NONE", 0

    # Speed 1–5 (analog)
    speed = int((dist / MAX_RADIUS) * 5)
    speed = max(1, speed)

    if abs(dx) > abs(dy):
        if dx > 0:
            return "RIGHT", speed
        else:
            return "LEFT", speed
    else:
        if dy < 0:
            return "UP", speed
        else:
            return "DOWN", speed
