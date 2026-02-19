import math
from collections import deque

# --- TUNING PARAMETERS ---
HISTORY_LEN = 25              # Number of frames to track the finger path
ROTATION_THRESHOLD = 200      # Degrees of rotation required (200 = a bit more than a half-circle)
MIN_SIZE = 50                 # Minimum width/height of the circle (ignores micro-jitters)

# Stores the (x, y) coordinates of the index finger
path_buffer = deque(maxlen=HISTORY_LEN)

def compute_circular_command(hx, hy, center_ignored):
    """
    Tracks the index finger to see if it drew a circle.
    'center_ignored' is accepted to match the engine.py call, but we calculate the true center dynamically.
    """
    # 1. Add current finger position to the path
    path_buffer.append((hx, hy))

    # Need enough points to make a shape
    if len(path_buffer) < 15:
        return "NONE"

    # 2. Calculate the dynamic center of the drawn shape
    xs = [p[0] for p in path_buffer]
    ys = [p[1] for p in path_buffer]
    
    cx = (max(xs) + min(xs)) / 2
    cy = (max(ys) + min(ys)) / 2

    # 3. Check if the drawn shape is big enough
    width = max(xs) - min(xs)
    height = max(ys) - min(ys)
    
    if width < MIN_SIZE or height < MIN_SIZE:
        return "NONE"

    # 4. Calculate the continuous angular rotation around our dynamic center
    total_rotation = 0
    prev_angle = None

    for x, y in path_buffer:
        angle = math.degrees(math.atan2(y - cy, x - cx))
        
        if prev_angle is not None:
            diff = angle - prev_angle
            
            # Normalize the difference to handle the -180 to +180 boundary flip
            if diff > 180:
                diff -= 360
            elif diff < -180:
                diff += 360
                
            total_rotation += diff
            
        prev_angle = angle

    # 5. Trigger if a circle was drawn!
    if abs(total_rotation) >= ROTATION_THRESHOLD:
        path_buffer.clear() # Reset so it doesn't double-trigger instantly
        
        if total_rotation > 0:
            return "REDO" # Clockwise
        else:
            return "UNDO" # Counter-Clockwise

    return "NONE"