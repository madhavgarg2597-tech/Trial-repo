import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';

const CameraFeed = ({ isSystemActive }) => {
  const canvasRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!isSystemActive) {
      if (wsRef.current) wsRef.current.close();
      return;
    }

    const connect = () => {
      // Use localhost to avoid IPv6 issues on Mac
      const socket = new WebSocket('ws://localhost:8000/ws/video');
      socket.binaryType = "arraybuffer"; // CRUCIAL for speed
      wsRef.current = socket;

      socket.onmessage = (event) => {
        const blob = new Blob([event.data], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            // NO MORE FLIPPING IN FRONTEND
            ctx.setTransform(1, 0, 0, 1, 0, 0); 
            ctx.drawImage(img, 0, 0);
          }
          URL.revokeObjectURL(url);
        };
        img.src = url;
      };

      socket.onclose = () => isSystemActive && setTimeout(connect, 1000);
    };

    connect();
    return () => wsRef.current?.close();
  }, [isSystemActive]);

  return (
    <Card className="relative overflow-hidden bg-black aspect-video flex items-center justify-center border-white/10 shadow-2xl">
      {isSystemActive ? (
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
      ) : (
        <div className="text-white/20 text-sm font-mono">SYSTEM OFFLINE</div>
      )}
    </Card>
  );
};

export default CameraFeed;