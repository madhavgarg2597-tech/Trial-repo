import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hand, Maximize2, Volume2, Copy, Camera, Type, RotateCcw, 
  Trash2, Activity, Clock, Zap, AlertCircle, RefreshCw, Cpu
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider'; // Uses Shadcn UI slider or standard input
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const GestureLibrary = () => {
  const [gestures, setGestures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

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

  // 1. Fetch Gestures
  const fetchGestures = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/gestures');
      const data = await res.json();
      setGestures(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load gestures", err);
      toast.error("Failed to connect to backend");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGestures();
  }, []);

  // 2. Update Toggle / Slider / Text
  const updateGesture = async (id, field, value) => {
    // Optimistic Update
    setGestures(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));

    try {
      await fetch(`http://localhost:8000/api/gestures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
    } catch (err) {
      console.error("Update failed", err);
      toast.error("Failed to update setting");
    }
  };

  // 3. Delete
  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`http://localhost:8000/api/gestures/${deleteId}`, { method: 'DELETE' });
      setGestures(prev => prev.filter(g => g.id !== deleteId));
      setDeleteId(null);
      toast.success("Gesture deleted");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading Library...</div>;

  return (
    <div className="min-h-screen p-8 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Gesture Library
        </h1>
        <p className="text-muted-foreground">Manage sensitivity, cooldowns, and active states for your dynamic gestures.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {gestures.map((gesture, index) => {
            const Icon = iconMap[gesture.id] || Cpu;
            
            return (
              <motion.div
                key={gesture.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "relative overflow-hidden rounded-xl border p-6 transition-all duration-300 backdrop-blur-md",
                  gesture.enabled 
                    ? "bg-[#18181B]/80 border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.05)]" 
                    : "bg-[#18181B]/40 border-white/5 opacity-70"
                )}
              >
                {/* Header with INDIVIDUAL TOGGLE */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-xl transition-colors",
                      gesture.enabled ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-muted-foreground"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{gesture.name}</h3>
                      <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {gesture.description || "Custom Gesture Control"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={gesture.enabled}
                      onCheckedChange={(val) => updateGesture(gesture.id, 'enabled', val)}
                      className="data-[state=checked]:bg-violet-500"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8"
                      onClick={() => setDeleteId(gesture.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Controls (Sensitivity, Cooldown, Trigger) */}
                <div className={cn("space-y-6 transition-opacity", !gesture.enabled && "opacity-40 pointer-events-none")}>
                  
                  {/* Sensitivity */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2 text-white/80">
                        <Activity className="w-4 h-4 text-blue-400" />
                        <span>Sensitivity</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {Math.round((gesture.sensitivity || 0.5) * 100)}%
                      </span>
                    </div>
                    {/* Fallback to range input if Slider component has issues */}
                    <input 
                      type="range" 
                      min="0.1" max="1.0" step="0.1"
                      value={gesture.sensitivity || 0.7}
                      onChange={(e) => updateGesture(gesture.id, 'sensitivity', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                  </div>

                  {/* Cooldown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2 text-white/80">
                        <Clock className="w-4 h-4 text-orange-400" />
                        <span>Cooldown</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {gesture.cooldown}s
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" max="5.0" step="0.1"
                      value={gesture.cooldown || 1.0}
                      onChange={(e) => updateGesture(gesture.id, 'cooldown', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  {/* Trigger Function */}
                  <div className="pt-2 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[100px]">
                        <Zap className="w-3 h-3" /> Function:
                      </div>
                      <Input 
                        className="h-8 bg-white/5 border-white/10 text-xs font-mono text-violet-300 focus:border-violet-500/50"
                        value={gesture.trigger || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGestures(prev => prev.map(g => g.id === gesture.id ? { ...g, trigger: val } : g));
                        }}
                        onBlur={(e) => updateGesture(gesture.id, 'trigger', e.target.value)}
                      />
                    </div>
                  </div>

                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              Delete Gesture?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to remove this gesture?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestureLibrary;