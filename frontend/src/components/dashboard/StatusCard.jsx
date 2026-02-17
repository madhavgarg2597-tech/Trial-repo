import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const StatusCard = ({ title, value, subtitle, icon: Icon, status, className }) => {
  const getStatusColor = () => {
    if (status === 'active' || status === 'ready') return 'text-green-400';
    if (status === 'warning') return 'text-yellow-400';
    if (status === 'error') return 'text-red-400';
    return 'text-violet-400';
  };

  const getStatusDot = () => {
    if (status === 'active' || status === 'ready') return 'bg-green-400';
    if (status === 'warning') return 'bg-yellow-400';
    if (status === 'error') return 'bg-red-400';
    return 'bg-violet-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/5 bg-[#18181B] p-6 hover:border-violet-500/30 transition-all duration-300 group',
        className
      )}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Icon className="w-5 h-5 text-violet-400" />
          </div>
          {status && (
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full animate-pulse', getStatusDot())} />
              <span className={cn('text-xs font-medium uppercase tracking-wider', getStatusColor())}>
                {status}
              </span>
            </div>
          )}
        </div>
        
        <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
        <p className="text-2xl font-bold text-white mb-1">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </motion.div>
  );
};