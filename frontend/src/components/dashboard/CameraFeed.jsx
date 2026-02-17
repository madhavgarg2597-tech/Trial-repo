import { motion } from 'framer-motion';
import { Camera, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CameraFeed = ({ isActive = true, className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/5 bg-[#18181B] aspect-video',
        className
      )}
    >
      {/* Mock camera feed background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-purple-900/20 to-black" />
      
      {/* Scanning overlay */}
      {isActive && (
        <>
          {/* Corner brackets */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-violet-400" />
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-violet-400" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-violet-400" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-violet-400" />
          
          {/* Scanning line */}
          <motion.div
            className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent"
            animate={{ y: [0, 300, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          
          {/* Center detection circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              className="w-32 h-32 rounded-full border-2 border-violet-400/50"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 w-32 h-32 rounded-full border-2 border-violet-400"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
            />
          </div>
        </>
      )}
      
      {/* Status indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full glass-effect">
        <div className={cn('w-2 h-2 rounded-full', isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400')} />
        <span className="text-xs font-medium text-white">
          {isActive ? 'Detecting' : 'Inactive'}
        </span>
      </div>
      
      {/* Camera placeholder when inactive */}
      {!isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Camera className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Camera feed inactive</p>
        </div>
      )}
      
      {/* Connection status */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-lg glass-effect">
        <Wifi className="w-4 h-4 text-green-400" />
        <span className="text-xs text-muted-foreground">Connected</span>
      </div>
    </motion.div>
  );
};