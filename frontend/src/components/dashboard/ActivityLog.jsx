import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ActivityLog = ({ activities, className }) => {
  return (
    <div className={cn('space-y-3', className)}>
      {activities.map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-start gap-3 p-3 rounded-lg bg-[#18181B] border border-white/5 hover:border-violet-500/20 transition-all duration-200 group"
        >
          {/* Success/Error indicator */}
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            activity.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
          )}>
            {activity.success ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <X className="w-4 h-4 text-red-400" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-white">{activity.gesture}</p>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-1">{activity.action}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    activity.confidence >= 90 ? 'bg-green-400' :
                    activity.confidence >= 80 ? 'bg-yellow-400' : 'bg-red-400'
                  )}
                  style={{ width: `${activity.confidence}%` }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {activity.confidence.toFixed(1)}%
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};