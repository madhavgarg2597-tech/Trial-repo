import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow, isValid } from 'date-fns'; // Import isValid

export const ActivityLog = ({ activities = [] }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground bg-black/20 rounded-xl border border-white/5">
        <Clock className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        // --- DEFENSIVE DATE PARSING ---
        let timeDisplay = "Just now";
        try {
          const date = new Date(activity.time);
          if (isValid(date)) {
            timeDisplay = formatDistanceToNow(date, { addSuffix: true });
          }
        } catch (e) {
          // If date fails, keep "Just now"
        }
        // -----------------------------

        return (
          <motion.div
            key={activity.id || index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative overflow-hidden rounded-xl bg-[#18181B] border border-white/10 p-4 group hover:border-violet-500/50 transition-colors"
          >
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="font-semibold text-white text-sm">
                  {activity.gesture}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {timeDisplay}
              </span>
            </div>
            
            <p className="text-xs text-muted-foreground ml-6">
              {activity.action}
            </p>
            
            {/* Progress Bar Visual */}
            <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 w-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        );
      })}
    </div>
  );
};