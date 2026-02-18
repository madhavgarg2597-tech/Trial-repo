import React, { useEffect, useState, useRef } from 'react';
import { Activity, Camera, VideoOff } from 'lucide-react';
import { Card } from '@/components/ui/card';

const CameraFeed = ({ isSystemActive }) => {
  const [frameSrc, setFrameSrc] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (isSystemActive) {
      connectWebSocket();
    } else {
      cleanupWebSocket();
    }
    return () => cleanupWebSocket();
  }, [isSystemActive]);

  const connectWebSocket = () => {
    if (wsRef.current) return;
    // FIX: Use 127.0.0.1
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/video');
    ws.binaryType = 'blob';

    ws.onmessage = (event) => {
      const url = URL.createObjectURL(event.data);
      setFrameSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    };

    ws.onerror = () => console.error("WS Error");
    wsRef.current = ws;
  };

  const cleanupWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setFrameSrc(null);
  };

  // ... rest of the render (return) code remains the same ...
  return (
    <Card className="relative overflow-hidden bg-black/40 border-white/10 h-full min-h-[400px] flex flex-col shadow-2xl">
      {/* ... keeping your existing UI code ... */}
       <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
        <div className={`w-2 h-2 rounded-full ${isSystemActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-[10px] font-medium text-white/90 tracking-wider">
          {isSystemActive ? 'LIVE FEED' : 'OFFLINE'}
        </span>
      </div>

      <div className="flex-1 relative flex items-center justify-center bg-[#121214]">
        {isSystemActive ? (
          frameSrc ? (
            <img 
              src={frameSrc} 
              alt="Gesture Feed" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-white/30 animate-pulse">
              <Activity className="w-10 h-10" />
              <span className="text-sm">Connecting to stream...</span>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center ring-1 ring-white/10">
              <VideoOff className="w-6 h-6 text-white/20" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Camera is Off</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-[200px] mx-auto">
                Toggle the switch in the top-right corner to start the system.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CameraFeed;  