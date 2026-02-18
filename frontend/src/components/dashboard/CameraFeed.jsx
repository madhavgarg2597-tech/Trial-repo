import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Wifi, WifiOff, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

// Backend WebSocket URL
const WS_URL = 'ws://localhost:8000/ws/video';

export const CameraFeed = ({ isActive = true, className }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    // Only connect if the component is active (switched on)
    if (!isActive) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setImageSrc(null);
      return;
    }

    // Initialize WebSocket
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.binaryType = 'blob'; // Important: We expect binary image data

    ws.onopen = () => {
      console.log('Connected to Video Stream');
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      // Create a URL for the raw image blob
      const url = URL.createObjectURL(event.data);
      setImageSrc((prev) => {
        // Clean up the previous URL to prevent memory leaks
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    };

    ws.onclose = () => {
      console.log('Disconnected from Video Stream');
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
      setError('Connection Failed');
      setIsConnected(false);
    };

    // Cleanup on unmount or when toggled off
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      if (imageSrc) URL.revokeObjectURL(imageSrc);
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
      {/* 1. STATE: Active & Connected (Show Video) */}
      {isActive && isConnected && imageSrc && (
        <img
          src={imageSrc}
          alt="Live Gesture Feed"
          className="w-full h-full object-cover" 
          />
      )}

      {/* 2. STATE: Active but Connecting/Loading */}
      {isActive && isConnected && !imageSrc && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
          <Activity className="w-10 h-10 text-violet-400 animate-pulse mb-2" />
          <p className="text-sm text-violet-300">Starting Stream...</p>
        </div>
      )}

      {/* 3. STATE: Active but Error/Disconnected */}
      {isActive && !isConnected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <WifiOff className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-white font-medium">Stream Disconnected</p>
          <p className="text-xs text-muted-foreground mt-1">
            {error || "Check if backend is running"}
          </p>
        </div>
      )}

      {/* 4. STATE: Inactive (Switched Off) */}
      {!isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#18181B]">
          <Camera className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
          <p className="text-sm text-muted-foreground">Camera feed inactive</p>
        </div>
      )}

      {/* Status Overlay (Top Left) */}
      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full glass-effect z-10">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isActive && isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
          )}
        />
        <span className="text-xs font-medium text-white">
          {isActive && isConnected ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* Connection Info (Bottom Right) */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-lg glass-effect z-10">
        {isConnected ? (
          <Wifi className="w-4 h-4 text-green-400" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-400" />
        )}
        <span className="text-xs text-muted-foreground">
          {isConnected ? 'Connected' : 'No Signal'}
        </span>
      </div>
    </motion.div>
  );
};