import { motion } from 'framer-motion';
import { Edit2, Trash2, Keyboard, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export const GestureCard = ({ gesture, onEdit, onDelete, onToggle }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#18181B] hover:border-violet-500/30 transition-all duration-300"
    >
      {/* Thumbnail */}
      {gesture.thumbnail && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={gesture.thumbnail}
            alt={gesture.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#18181B] to-transparent" />
          
          {/* Confidence badge */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg glass-effect">
            <span className="text-xs font-semibold text-white">{gesture.confidence}%</span>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{gesture.name}</h3>
            <p className="text-sm text-muted-foreground">{gesture.action}</p>
          </div>
          <Switch
            checked={gesture.enabled}
            onCheckedChange={() => onToggle?.(gesture.id)}
            className="data-[state=checked]:bg-violet-500"
          />
        </div>
        
        {/* Key binding */}
        {gesture.keyBinding && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-white/5">
            <Keyboard className="w-4 h-4 text-violet-400" />
            <code className="text-xs font-mono text-muted-foreground">{gesture.keyBinding}</code>
          </div>
        )}
        
        {/* Cooldown for movement gestures */}
        {gesture.type === 'movement' && (
          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Cooldown: {gesture.cooldown}ms</span>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-2">
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