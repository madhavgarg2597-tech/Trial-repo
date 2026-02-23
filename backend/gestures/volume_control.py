import numpy as np
import cv2
import platform
import subprocess
import math

# Conditional imports for Windows
system_os = platform.system()
if system_os == "Windows":
    try:
        import comtypes
        from ctypes import cast, POINTER
        from comtypes import CLSCTX_ALL
        from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
        
        # Fallback COM Definitions
        CLSID_MMDeviceEnumerator = comtypes.GUID("{BCDE0395-E52F-467C-8E3D-C4579291692E}")
        IMMDeviceEnumerator_ID = comtypes.GUID("{A95664D2-9614-4F35-A746-DE8DB63617E6}")
        IMMDevice_ID = comtypes.GUID("{D666063F-1587-4E43-81F1-B948E807363F}")
        
        class IMMDeviceEnumerator(comtypes.IUnknown):
            _iid_ = IMMDeviceEnumerator_ID
            _methods_ = [
                comtypes.COMMETHOD([], comtypes.HRESULT, "EnumAudioEndpoints", (["in"], comtypes.c_int, "dataFlow"), (["in"], comtypes.c_int, "dwStateMask"), (["out"], POINTER(POINTER(comtypes.IUnknown)), "ppDevices")),
                comtypes.COMMETHOD([], comtypes.HRESULT, "GetDefaultAudioEndpoint", (["in"], comtypes.c_int, "dataFlow"), (["in"], comtypes.c_int, "role"), (["out"], POINTER(POINTER(comtypes.IUnknown)), "ppEndpoint"))
            ]
        class IMMDevice(comtypes.IUnknown):
            _iid_ = IMMDevice_ID
            _methods_ = [
                comtypes.COMMETHOD([], comtypes.HRESULT, "Activate", (["in"], POINTER(comtypes.GUID), "iid"), (["in"], comtypes.c_int, "dwClsCtx"), (["in"], POINTER(comtypes.IUnknown), "pActivationParams"), (["out"], POINTER(POINTER(comtypes.IUnknown)), "ppInterface")),
                comtypes.COMMETHOD([], comtypes.HRESULT, "OpenPropertyStore", (["in"], comtypes.c_int, "stgmAccess"), (["out"], POINTER(POINTER(comtypes.IUnknown)), "ppProperties")),
                comtypes.COMMETHOD([], comtypes.HRESULT, "GetId", (["out"], POINTER(comtypes.c_wchar_p), "ppstrId")),
                comtypes.COMMETHOD([], comtypes.HRESULT, "GetState", (["out"], POINTER(comtypes.c_int), "pdwState"))
            ]
    except ImportError:
        print("⚠️ Warning: Windows audio libraries not found.")

class VolumeControl:
    def __init__(self):
        self.volume_mode = False
        self.start_distance = 0
        self.start_volume = 0
        self.current_volume = 0
        self.last_set_volume = -1  # LAG FIX: Tracks last updated volume
        self.volume_interface = None 
        self._init_audio()

    def _init_audio(self):
        """Robust Initialization for both OS types"""
        if system_os == "Windows":
            try:
                try: comtypes.CoInitialize()
                except: pass
                
                try:
                    # Method A: Standard
                    devices = AudioUtilities.GetSpeakers()
                    interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
                    self.volume_interface = cast(interface, POINTER(IAudioEndpointVolume))
                    return
                except Exception: pass
                
                # Method B: Fallback
                enumerator = comtypes.CoCreateInstance(CLSID_MMDeviceEnumerator, IMMDeviceEnumerator, comtypes.CLSCTX_INPROC_SERVER)
                device_unknown = enumerator.GetDefaultAudioEndpoint(0, 1)
                device = device_unknown.QueryInterface(IMMDevice)
                interface = device.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
                self.volume_interface = cast(interface, POINTER(IAudioEndpointVolume))
            except Exception as e:
                print(f"❌ Windows Audio Init Failed: {e}")
        
        elif system_os == "Darwin":
            self.volume_interface = "mac_ready"

    def get_system_volume(self):
        if system_os == "Windows" and self.volume_interface:
            try: return int(round(self.volume_interface.GetMasterVolumeLevelScalar() * 100))
            except: return 50
        elif system_os == "Darwin":
            try:
                result = subprocess.check_output(["osascript", "-e", "output volume of (get volume settings)"])
                return int(result.strip())
            except: return 50
        return 50

    def set_system_volume(self, vol_percent):
        val = max(0, min(100, vol_percent))
        if system_os == "Windows" and self.volume_interface:
            try: self.volume_interface.SetMasterVolumeLevelScalar(val / 100.0, None)
            except: pass
        elif system_os == "Darwin":
            try:
                # LAG FIX: Popen runs in the background instantly without blocking the camera frame
                subprocess.Popen(["osascript", "-e", f"set volume output volume {int(val)}"])
            except: pass

    def process(self, frame, hand_wrapper, fingers, w, h):
        lm_list = hand_wrapper.landmark
        thumb_tip, index_tip = lm_list[4], lm_list[8]
        thumb_x, thumb_y = int(thumb_tip.x * w), int(thumb_tip.y * h)
        index_x, index_y = int(index_tip.x * w), int(index_tip.y * h)

        distance = math.hypot(thumb_x - index_x, thumb_y - index_y)
        pinch_condition = (fingers[0] and fingers[1] and not fingers[3] and not fingers[4])

        if pinch_condition and not self.volume_mode:
            self.volume_mode = True
            self.start_distance = distance
            self.start_volume = self.get_system_volume()
            self.last_set_volume = self.start_volume
            
        elif not pinch_condition and self.volume_mode:
            self.volume_mode = False

        if self.volume_mode:
            cv2.line(frame, (thumb_x, thumb_y), (index_x, index_y), (255, 0, 255), 2)

            change = (distance - self.start_distance) / 1.5
            target_vol = self.start_volume + change
            self.current_volume = int(max(0, min(100, target_vol)))

            # LAG FIX: Only trigger OS API if volume changed by at least 2%
            if abs(self.current_volume - self.last_set_volume) >= 2:
                self.set_system_volume(self.current_volume)
                self.last_set_volume = self.current_volume

            cv2.rectangle(frame, (50, 150), (85, 400), (0, 255, 0), 3)
            vol_bar = np.interp(self.current_volume, [0, 100], [400, 150])
            cv2.rectangle(frame, (50, int(vol_bar)), (85, 400), (0, 255, 0), cv2.FILLED)
            cv2.putText(frame, f"{self.current_volume}%", (40, 450), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)
        
        return frame, self.current_volume