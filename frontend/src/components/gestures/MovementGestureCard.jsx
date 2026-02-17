import { motion } from 'framer-motion';
import { Edit2, Trash2, Sliders, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export const MovementGestureCard = ({ gesture, onEdit, onDelete, onToggle, onSensitivityChange }) => {
  const [showSettings, setShowSettings] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden rounded-xl border border-white/5 bg-[#18181B] hover:border-violet-500/30 transition-all duration-300"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">{gesture.name}</h3>
            <p className="text-sm text-muted-foreground mb-2">{gesture.description}</p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/20">
              <span className="text-xs font-medium text-violet-400">{gesture.action}</span>
            </div>
          </div>
          <Switch
            checked={gesture.enabled}
            onCheckedChange={() => onToggle?.(gesture.id)}
            className="data-[state=checked]:bg-violet-500"
          />
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="px-3 py-2 rounded-lg bg-white/5">
            <p className="text-xs text-muted-foreground mb-1">Confidence</p>
            <p className="text-lg font-semibold text-white">{gesture.confidence}%</p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-white/5">
            <p className="text-xs text-muted-foreground mb-1">Cooldown</p>
            <p className="text-lg font-semibold text-white">{gesture.cooldown}ms</p>
          </div>
        </div>
        
        {/* Sensitivity slider */}
        <motion.div
          initial={false}
          animate={{ height: showSettings ? 'auto' : 0, opacity: showSettings ? 1 : 0 }}
          className="overflow-hidden"
        >
          <div className="mb-4 p-3 rounded-lg bg-white/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Sensitivity</span>
              <span className="text-sm font-semibold text-violet-400">{gesture.sensitivity}%</span>
            </div>
            <Slider
              value={[gesture.sensitivity]}
              onValueChange={(value) => onSensitivityChange?.(gesture.id, value[0])}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        </motion.div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
              showSettings
                ? 'bg-violet-500/20 text-violet-400'
                : 'bg-white/5 hover:bg-violet-500/20 text-muted-foreground hover:text-violet-400'
            )}
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit?.(gesture)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-violet-500/20 text-muted-foreground hover:text-violet-400 transition-all duration-200"
          >
            <Edit2 className="w-4 h-4" />
            <span className="text-sm font-medium">Edit</span>
          </button>
          <button
            onClick={() => onDelete?.(gesture.id)}
            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};