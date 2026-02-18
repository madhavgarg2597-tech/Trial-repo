import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hand, Maximize2, Volume2, Copy, Camera, Type, RotateCcw, 
  Trash2, Activity, Clock, Zap, AlertCircle, RefreshCw, Cpu,
  Save, PlayCircle, SkipForward, SkipBack, VolumeX, Monitor,
  Layers, ArrowLeftSquare, ArrowRightSquare, XCircle, ChevronDown, Lock
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const GestureLibrary = () => {
  const [gestures, setGestures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

  // 1. LOCKED GESTURES (Cannot be re-mapped)
  const LOCKED_GESTURES = ["volume", "zoom", "text_mode"];

  const actionCategories = [
    { label: "General Productivity", actions: [
      { id: "save_file", label: "Save Document", icon: Save },
      { id: "refresh_page", label: "Refresh / Reload", icon: RefreshCw },
      { id: "copy", label: "Copy Selection", icon: Copy },
      { id: "paste", label: "Paste Clipboard", icon: Copy },
    ]},
    { label: "Media & Entertainment", actions: [
      { id: "play_pause", label: "Play / Pause", icon: PlayCircle },
      { id: "next_track", label: "Next Track", icon: SkipForward },
      { id: "prev_track", label: "Previous Track", icon: SkipBack },
      { id: "mute_audio", label: "Mute System", icon: VolumeX },
    ]},
    { label: "Window Management", actions: [
      { id: "show_desktop", label: "Show Desktop", icon: Monitor },
      { id: "task_view", label: "Task View", icon: Layers },
      { id: "snap_left", label: "Snap Window Left", icon: ArrowLeftSquare },
      { id: "snap_right", label: "Snap Window Right", icon: ArrowRightSquare },
      { id: "close_window", label: "Close App", icon: XCircle },
    ]}
  ];

  const allActions = actionCategories.flatMap(cat => cat.actions);
  const iconMap = { volume: Volume2, zoom: Maximize2, swipe: RefreshCw, snap: Hand, copy_paste: Copy, screenshot: Camera, text_mode: Type, circular: RotateCcw };

  const fetchGestures = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/gestures');
      const data = await res.json();
      setGestures(Array.isArray(data) ? data : []);
    } catch (err) { toast.error("Connection Failed"); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchGestures(); }, []);

  // 2. CONFLICT DETECTION LOGIC
  const checkCollision = (id, newActionId) => {
    const existing = gestures.find(g => g.id !== id && g.trigger === newActionId);
    return existing ? existing.name : null;
  };

  const updateGesture = async (id, field, value) => {
    // Check if Locked
    if (field === 'trigger' && LOCKED_GESTURES.includes(id)) {
      toast.error("Sorry, core gesture mapping cannot be changed", { icon: <Lock className="w-4 h-4" /> });
      return;
    }

    // Check for Collision
    if (field === 'trigger') {
      const conflictName = checkCollision(id, value);
      if (conflictName) {
        toast.warning(`${conflictName} is already doing this!`);
        // We still let them set it, but the UI will show the red border warning
      }
    }

    setGestures(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
    try {
      await fetch(`http://localhost:8000/api/gestures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
    } catch (err) { toast.error("Failed to save"); }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen p-8 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {gestures.map((gesture) => {
            const isLocked = LOCKED_GESTURES.includes(gesture.id);
            const conflictName = checkCollision(gesture.id, gesture.trigger);
            const activeAction = allActions.find(a => a.id === gesture.trigger);

            return (
              <motion.div
                key={gesture.id}
                className={cn(
                  "relative rounded-xl border p-6 transition-all duration-300 backdrop-blur-md",
                  gesture.enabled ? "bg-[#18181B]/80 border-violet-500/30" : "bg-[#18181B]/40 opacity-70",
                  conflictName && "border-red-500/50 ring-1 ring-red-500/20" // RED BORDER ON COLLISION
                )}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl", gesture.enabled ? "bg-violet-500/20 text-violet-400" : "bg-white/5")}>
                      {iconMap[gesture.id] ? <Icon className="w-6 h-6" /> : <Cpu className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        {gesture.name} {isLocked && <Lock className="w-3 h-3 opacity-50" />}
                      </h3>
                      {conflictName && <p className="text-[10px] text-red-400 font-medium">Conflicts with {conflictName}</p>}
                    </div>
                  </div>
                  <Switch checked={gesture.enabled} onCheckedChange={(val) => updateGesture(gesture.id, 'enabled', val)} />
                </div>

                <div className={cn("space-y-6 pt-4 border-t border-white/5", !gesture.enabled && "opacity-40")}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Action Mapping</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={isLocked}>
                        <Button variant="outline" className={cn("h-9 border-white/10 text-xs", isLocked && "opacity-50 grayscale")}>
                          {activeAction?.label || gesture.trigger}
                          <ChevronDown className="ml-2 w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#18181B] border-white/10 text-white w-56">
                        {actionCategories.map((cat) => (
                          <DropdownMenuGroup key={cat.label}>
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground">{cat.label}</DropdownMenuLabel>
                            {cat.actions.map(a => (
                              <DropdownMenuItem key={a.id} onClick={() => updateGesture(gesture.id, 'trigger', a.id)} className="text-xs">
                                <a.icon className="w-3.5 h-3.5 mr-2" /> {a.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuGroup>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};