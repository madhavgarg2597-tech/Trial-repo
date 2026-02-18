import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Wifi, WifiOff, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

// Backend WebSocket URL
const WS_URL = 'ws://localhost:8000/ws/video';

export const CameraFeed = ({ isActive = true, className }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  
  // 1. USE REF (This is the secret to smooth video)
  const imgRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    // Cleanup if toggled off
    if (!isActive) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Initialize WebSocket
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.binaryType = 'blob'; 

    ws.onopen = () => {
      console.log('Connected to Video Stream');
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      // 2. DIRECT UPDATE: We update the DOM directly, bypassing React state
      if (imgRef.current) {
        const url = URL.createObjectURL(event.data);
        
        // Cleanup old URL to prevent memory leak
        const oldUrl = imgRef.current.getAttribute('data-prev-url');
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        
        // Set new URL instantly
        imgRef.current.src = url;
        imgRef.current.setAttribute('data-prev-url', url);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
      setError('Connection Failed');
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [isActive]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/5 bg-[#18181B] aspect-video flex items-center justify-center',
        className
      )}
    >
      {/* 1. STATE: Active (Show Video) */}
      {isActive && (
        <img
          ref={imgRef} // Connects to the useRef above
          alt="Live Gesture Feed"
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isConnected ? "opacity-100" : "opacity-0"
          )}
          style={{ transform: 'none' }} // Ensure no CSS flipping
        />
      )}

      {/* 2. STATE: Loading */}
      {isActive && !isConnected && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
          <Activity className="w-10 h-10 text-violet-400 animate-pulse mb-2" />
          <p className="text-sm text-violet-300">Starting Stream...</p>
        </div>
      )}

      {/* 3. STATE: Error */}
      {isActive && !isConnected && error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <WifiOff className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-white font-medium">Stream Disconnected</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      )}

      {/* 4. STATE: Inactive */}
      {!isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#18181B]">
          <Camera className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
          <p className="text-sm text-muted-foreground">Camera feed inactive</p>
        </div>
      )}

      {/* Status Overlay */}
      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full glass-effect z-10">
        <div className={cn('w-2 h-2 rounded-full', isActive && isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400')} />
        <span className="text-xs font-medium text-white">{isActive && isConnected ? 'Live' : 'Offline'}</span>
      </div>
    </motion.div>
  );
};