import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hand, Maximize2, Volume2, Copy, Camera, Type, RotateCcw, 
  Trash2, Activity, Clock, Zap, AlertCircle, RefreshCw, Cpu,
  Save, PlayCircle, SkipForward, SkipBack, VolumeX, Monitor,
  Layers, ArrowLeftSquare, ArrowRightSquare, XCircle, ChevronDown, Lock, Clipboard
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const GestureLibrary = () => {
  const [gestures, setGestures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

  // 1. LOCKED GESTURES 
  // (We removed 'snap' and others from lock so you can remap them if you want, 
  // but we kept core drivers like volume/zoom locked to prevent breaking the physics of the gesture)
  const LOCKED_GESTURES = ["volume", "zoom", "text_mode"];

  // 2. CATEGORIZED ACTION DICTIONARY (Restored Original Functions)
  const actionCategories = [
    {
      label: "Core System Functions",
      actions: [
        { id: "show_desktop", label: "Snap Action (Run Code)", icon: Zap },
        { id: "switch_tabs", label: "Switch Tabs", icon: RefreshCw },
        { id: "undo_redo", label: "Undo / Redo Menu", icon: RotateCcw },
        { id: "screenshot", label: "Take Screenshot", icon: Camera },
        { id: "volume_control", label: "Volume Control", icon: Volume2 },
        { id: "zoom_control", label: "Zoom Control", icon: Maximize2 },
        { id: "arrow_keys", label: "Text Joystick", icon: Type },
      ]
    },
    {
      label: "General Productivity",
      actions: [
        { id: "save_file", label: "Save Document", icon: Save },
        { id: "refresh_page", label: "Refresh / Reload", icon: RefreshCw },
        { id: "copy", label: "Copy Selection", icon: Copy },
        { id: "paste", label: "Paste Clipboard", icon: Clipboard },
      ]
    },
    {
      label: "Media & Entertainment",
      actions: [
        { id: "play_pause", label: "Play / Pause", icon: PlayCircle },
        { id: "next_track", label: "Next Track", icon: SkipForward },
        { id: "prev_track", label: "Previous Track", icon: SkipBack },
        { id: "mute_audio", label: "Mute System", icon: VolumeX },
      ]
    },
    {
      label: "Window Management",
      actions: [
        { id: "task_view", label: "Task View", icon: Layers },
        { id: "snap_left", label: "Snap Window Left", icon: ArrowLeftSquare },
        { id: "snap_right", label: "Snap Window Right", icon: ArrowRightSquare },
        { id: "close_window", label: "Close App", icon: XCircle },
      ]
    }
  ];

  const allActions = actionCategories.flatMap(cat => cat.actions);

  const iconMap = {
    volume: Volume2, zoom: Maximize2, swipe: RefreshCw, snap: Hand,
    copy: Copy, paste: Clipboard,
    screenshot: Camera, text_mode: Type, circular: RotateCcw
  };

  // 3. FETCH GESTURES
  const fetchGestures = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/gestures');
      const data = await res.json();
      setGestures(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to connect to backend");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchGestures(); }, []);

  // 4. COLLISION DETECTION
  const checkCollision = (id, newActionId) => {
    const existing = gestures.find(g => g.id !== id && g.trigger === newActionId);
    return existing ? existing.name : null;
  };

  // 5. UPDATE HANDLER
  const updateGesture = async (id, field, value) => {
    if (field === 'trigger' && LOCKED_GESTURES.includes(id)) {
      toast.error("Sorry, core gesture mapping cannot be changed", { 
        icon: <Lock className="w-4 h-4 text-red-400" /> 
      });
      return;
    }

    if (field === 'trigger') {
      const conflictName = checkCollision(id, value);
      if (conflictName) {
        toast.warning(`${conflictName} is already doing this!`);
      }
    }

    setGestures(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));

    try {
      await fetch(`http://localhost:8000/api/gestures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if(field === 'trigger') toast.success(`Mapped to ${allActions.find(a => a.id === value)?.label}`);
    } catch (err) {
      toast.error("Failed to update setting");
    }
  };

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

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Library...</div>;

  return (
    <div className="min-h-screen p-8 pb-20">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Gesture Library</h1>
        <p className="text-muted-foreground">Manage sensitivity, active states, and custom action mappings.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {gestures.map((gesture, index) => {
            const Icon = iconMap[gesture.id] || Cpu;
            const isLocked = LOCKED_GESTURES.includes(gesture.id);
            const conflictName = checkCollision(gesture.id, gesture.trigger);
            const activeAction = allActions.find(a => a.id === gesture.trigger);

            return (
              <motion.div
                key={gesture.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "relative overflow-hidden rounded-xl border p-6 transition-all duration-300 backdrop-blur-md",
                  gesture.enabled ? "bg-[#18181B]/80 border-violet-500/30" : "bg-[#18181B]/40 border-white/5 opacity-70",
                  conflictName && "border-red-500/50 ring-1 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl transition-colors", gesture.enabled ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-muted-foreground")}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        {gesture.name} {isLocked && <Lock className="w-3.5 h-3.5 text-muted-foreground opacity-50" />}
                      </h3>
                      {conflictName ? (
                        <p className="text-[11px] text-red-400 font-medium animate-pulse">Conflicts with {conflictName}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground max-w-[200px] truncate">{gesture.description || "Active Gesture"}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={gesture.enabled} onCheckedChange={(val) => updateGesture(gesture.id, 'enabled', val)} />
                    {!isLocked && (
                      <Button variant="ghost" size="icon" className="text-red-400 h-8 w-8" onClick={() => setDeleteId(gesture.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Controls Area */}
                <div className={cn("space-y-6 transition-opacity", !gesture.enabled && "opacity-40 pointer-events-none")}>
                  
                  {/* Action Dropdown Mapping */}
                  <div className="pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Zap className="w-4 h-4 text-violet-400" /> Trigger Action
                      </span>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={isLocked}>
                          <Button variant="outline" className={cn(
                            "h-9 bg-white/5 border-white/10 text-xs text-violet-300 hover:text-violet-200",
                            isLocked && "opacity-50 grayscale cursor-not-allowed border-transparent"
                          )}>
                            {activeAction ? <activeAction.icon className="w-3.5 h-3.5 mr-2" /> : <Activity className="w-3.5 h-3.5 mr-2" />}
                            {activeAction ? activeAction.label : gesture.trigger}
                            <ChevronDown className="w-3.5 h-3.5 ml-2 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#18181B] border-white/10 text-white w-56 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {actionCategories.map((cat, i) => (
                            <DropdownMenuGroup key={cat.label}>
                              {i > 0 && <DropdownMenuSeparator className="bg-white/5" />}
                              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5">{cat.label}</DropdownMenuLabel>
                              {cat.actions.map(action => (
                                <DropdownMenuItem 
                                  key={action.id} 
                                  className="text-xs gap-2 focus:bg-violet-500/20 focus:text-violet-300 cursor-pointer"
                                  onClick={() => updateGesture(gesture.id, 'trigger', action.id)}
                                >
                                  <action.icon className="w-3.5 h-3.5" />
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuGroup>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Sensitivity Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2 text-white/80"><Activity className="w-4 h-4 text-blue-400" /><span>Sensitivity</span></div>
                      <span className="font-mono text-xs text-muted-foreground">{Math.round((gesture.sensitivity || 0.5) * 100)}%</span>
                    </div>
                    <input type="range" min="0.1" max="1.0" step="0.1" value={gesture.sensitivity || 0.7} onChange={(e) => updateGesture(gesture.id, 'sensitivity', parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                  </div>

                  {/* Cooldown Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2 text-white/80"><Clock className="w-4 h-4 text-orange-400" /><span>Cooldown Delay</span></div>
                      <span className="font-mono text-xs text-muted-foreground">{gesture.cooldown}s</span>
                    </div>
                    <input type="range" min="0.1" max="5.0" step="0.1" value={gesture.cooldown || 1.0} onChange={(e) => updateGesture(gesture.id, 'cooldown', parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400"><AlertCircle className="w-5 h-5" />Delete Gesture?</DialogTitle>
            <DialogDescription className="text-muted-foreground">Are you sure you want to remove this gesture? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter><Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="destructive" className="bg-red-600" onClick={confirmDelete}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestureLibrary;