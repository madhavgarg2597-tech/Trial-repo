import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Hand,
  Maximize2,
  Minimize2,
  Volume2,
  Copy,
  Camera,
  Type,
  RotateCcw,
  Power,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const GestureLibrary = () => {
  const [gestures, setGestures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Map backend IDs to Icons
  const iconMap = {
    volume: Volume2,
    zoom: Maximize2,
    swipe: RefreshCw,
    snap: Hand,
    copy_paste: Copy,
    screenshot: Camera,
    text_mode: Type,
    circular: RotateCcw
  };

  // 1. Fetch Gestures on Load
  useEffect(() => {
    const fetchGestures = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/gestures');
        if (!response.ok) throw new Error('Failed to connect to backend');
        const data = await response.json();
        setGestures(data);
        setError(null);
      } catch (err) {
        console.error("API Error:", err);
        setError("Could not load gestures. Is backend running?");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGestures();
  }, []);

  // 2. Handle Toggle Switch
  const toggleGesture = async (id, currentStatus) => {
    // Optimistic UI Update (change immediately for speed)
    setGestures(prev =>
      prev.map(g => (g.id === id ? { ...g, enabled: !currentStatus } : g))
    );

    try {
      // Send update to Backend
      await fetch(`http://localhost:8000/api/gestures/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentStatus }),
      });
    } catch (err) {
      console.error("Failed to toggle:", err);
      // Revert if failed
      setGestures(prev =>
        prev.map(g => (g.id === id ? { ...g, enabled: currentStatus } : g))
      );
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading Gesture Engine...</div>;
  if (error) return <div className="p-8 text-center text-red-400">{error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {gestures.map((gesture, index) => {
        const Icon = iconMap[gesture.id] || Cpu; // Default to CPU icon if missing

        return (
          <motion.div
            key={gesture.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "group relative overflow-hidden rounded-xl border p-4 transition-all duration-300",
              gesture.enabled
                ? "bg-white/5 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                : "bg-white/5 border-white/5 hover:border-white/10"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-lg transition-colors",
                  gesture.enabled ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-muted-foreground"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-white">{gesture.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {gesture.enabled ? 'Active' : 'Disabled'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => toggleGesture(gesture.id, gesture.enabled)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50",
                  gesture.enabled ? "bg-violet-500" : "bg-white/10"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200",
                    gesture.enabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
            
            {/* Status Indicator Bar */}
            <div className={cn(
              "absolute bottom-0 left-0 h-1 w-full transition-transform duration-300",
              gesture.enabled ? "bg-violet-500 translate-y-0" : "bg-transparent translate-y-1"
            )} />
          </motion.div>
        );
      })}
    </div>
  );
};