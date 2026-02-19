import cv2

def test_cameras():
    print("🔍 Scanning for cameras...")
    # Try indices 0 to 4
    for index in range(5):
        cap = cv2.VideoCapture(index)
        if cap.isOpened():
            print(f"✅ Camera found at Index {index}!")
            ret, frame = cap.read()
            if ret:
                print(f"   📸 It works! Resolution: {frame.shape[1]}x{frame.shape[0]}")
                # Show a popup to prove it (Press Q to close it)
                cv2.imshow(f"Testing Camera {index}", frame)
                cv2.waitKey(2000) 
                cv2.destroyAllWindows()
            else:
                print(f"   ⚠️ Opens but returns no video (Black screen).")
            cap.release()
        else:
            print(f"❌ No camera at Index {index}")

if __name__ == "__main__":
    test_cameras()