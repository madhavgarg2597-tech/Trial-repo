import numpy as np
import cv2
import comtypes
from ctypes import cast, POINTER
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume

class VolumeControl:
    def __init__(self):
        self.volume_mode = False
        self.start_distance = 0
        self.start_volume = 0
        self.current_volume = 0
        self.volume = None 

    def _init_audio(self):
        """Initializes Audio with Thread Safety and Fallbacks"""
        try:
            # 1. Thread Safety
            try:
                comtypes.CoInitialize()
            except: 
                pass # Already initialized
            
            # 2. Try Standard Method (Pycaw wrapper)
            try:
                devices = AudioUtilities.GetSpeakers()
                interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
                self.volume = cast(interface, POINTER(IAudioEndpointVolume))
                print("✅ Audio Initialized (Method A)")
                return
            except Exception:
                pass

            # 3. Fallback Method (Direct COM access)
            print("⚠️ Method A failed, trying Fallback...")
            enumerator = comtypes.CoCreateInstance(
                CLSID_MMDeviceEnumerator,
                IMMDeviceEnumerator,
                comtypes.CLSCTX_INPROC_SERVER
            )
            
            # Get generic device pointer
            device_unknown = enumerator.GetDefaultAudioEndpoint(0, 1) # 0=Render, 1=Multimedia
            
            # FIX: Cast generic IUnknown to IMMDevice so we can call Activate()
            device = device_unknown.QueryInterface(IMMDevice)
            
            interface = device.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            self.volume = cast(interface, POINTER(IAudioEndpointVolume))
            print("✅ Audio Initialized (Method B)")

        except Exception as e:
            print(f"❌ Audio Init Failed: {e}")
            self.volume = None

    def get_system_volume(self):
        """Gets current volume as percentage (0-100)"""
        if not self.volume: self._init_audio()
        if self.volume:
            try:
                return int(round(self.volume.GetMasterVolumeLevelScalar() * 100))
            except: return 50
        return 50

    def set_system_volume(self, vol_percent):
        """Sets volume scalar (0.0 to 1.0)"""
        if not self.volume: self._init_audio()
        if self.volume:
            try:
                val = max(0, min(100, vol_percent))
                self.volume.SetMasterVolumeLevelScalar(val / 100.0, None)
            except: pass

    def process(self, frame, hand_landmarks, fingers, w, h):
        if self.volume is None:
            self._init_audio()

        thumb_tip = hand_landmarks.landmark[4]
        index_tip = hand_landmarks.landmark[8]

        thumb_x, thumb_y = int(thumb_tip.x * w), int(thumb_tip.y * h)
        index_x, index_y = int(index_tip.x * w), int(index_tip.y * h)

        distance = np.sqrt((thumb_x - index_x) ** 2 + (thumb_y - index_y) ** 2)

        thumb_up = fingers[0]
        index_up = fingers[1]
        middle_up = fingers[2]
        ring_up = fingers[3]
        pinky_up = fingers[4]

        # Trigger: Pinch (Thumb + Index) while others are down
        pinch_condition = (thumb_up and index_up and not middle_up and not ring_up and not pinky_up)

        if pinch_condition and not self.volume_mode:
            self.volume_mode = True
            self.start_distance = distance
            self.start_volume = self.get_system_volume()
            
        elif not pinch_condition and self.volume_mode:
            self.volume_mode = False

        if self.volume_mode:
            cv2.line(frame, (thumb_x, thumb_y), (index_x, index_y), (255, 0, 255), 2)

            # Sensitivity: Divide by 2.0
            change = (distance - self.start_distance) / 2.0
            target_vol = self.start_volume + change
            
            self.set_system_volume(target_vol)
            self.current_volume = int(max(0, min(100, target_vol)))

            # UI
            cv2.putText(frame, f"Vol: {self.current_volume}%", (index_x, index_y - 20), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 255), 2)
            
            cv2.rectangle(frame, (50, 150), (85, 400), (0, 255, 0), 3)
            vol_bar = np.interp(self.current_volume, [0, 100], [400, 150])
            cv2.rectangle(frame, (50, int(vol_bar)), (85, 400), (0, 255, 0), cv2.FILLED)
        
        return frame, self.current_volume

# --- FALLBACK COM DEFINITIONS ---
CLSID_MMDeviceEnumerator = comtypes.GUID("{BCDE0395-E52F-467C-8E3D-C4579291692E}")
IMMDeviceEnumerator_ID = comtypes.GUID("{A95664D2-9614-4F35-A746-DE8DB63617E6}")
IMMDevice_ID = comtypes.GUID("{D666063F-1587-4E43-81F1-B948E807363F}")

class IMMDeviceEnumerator(comtypes.IUnknown):
    _iid_ = IMMDeviceEnumerator_ID
    _methods_ = [
        comtypes.COMMETHOD([], comtypes.HRESULT, "EnumAudioEndpoints",
                           (["in"], comtypes.c_int, "dataFlow"),
                           (["in"], comtypes.c_int, "dwStateMask"),
                           (["out"], POINTER(POINTER(comtypes.IUnknown)), "ppDevices")),
        comtypes.COMMETHOD([], comtypes.HRESULT, "GetDefaultAudioEndpoint",
                           (["in"], comtypes.c_int, "dataFlow"),
                           (["in"], comtypes.c_int, "role"),
                           (["out"], POINTER(POINTER(comtypes.IUnknown)), "ppEndpoint"))
    ]

# NEW: Missing Definition that caused the error
class IMMDevice(comtypes.IUnknown):
    _iid_ = IMMDevice_ID
    _methods_ = [
        comtypes.COMMETHOD([], comtypes.HRESULT, "Activate",
                           (["in"], POINTER(comtypes.GUID), "iid"),
                           (["in"], comtypes.c_int, "dwClsCtx"),
                           (["in"], POINTER(comtypes.IUnknown), "pActivationParams"),
                           (["out"], POINTER(POINTER(comtypes.IUnknown)), "ppInterface")),
        comtypes.COMMETHOD([], comtypes.HRESULT, "OpenPropertyStore",
                           (["in"], comtypes.c_int, "stgmAccess"),
                           (["out"], POINTER(POINTER(comtypes.IUnknown)), "ppProperties")),
        comtypes.COMMETHOD([], comtypes.HRESULT, "GetId",
                           (["out"], POINTER(comtypes.c_wchar_p), "ppstrId")),
        comtypes.COMMETHOD([], comtypes.HRESULT, "GetState",
                           (["out"], POINTER(comtypes.c_int), "pdwState"))
    ]