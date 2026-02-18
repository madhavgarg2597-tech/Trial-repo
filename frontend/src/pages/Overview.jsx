import { motion } from 'framer-motion';
import { Activity, Camera, Zap, TrendingUp, Power } from 'lucide-react';
import { StatusCard } from '@/components/dashboard/StatusCard';
import { CameraFeed } from '@/components/dashboard/CameraFeed';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { systemStatus, recentActivity } from '@/data/mockData';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';

export default function Overview() {
  // This Master Toggle controls the Camera & Engine
  const [gestureControlEnabled, setGestureControlEnabled] = useState(true);

  return (
    <div className="min-h-screen p-8">
      {/* Header with MASTER TOGGLE */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Control Dashboard
            </h1>
            <p className="text-muted-foreground">Monitor and manage your gesture-based desktop control</p>
          </div>
          
          {/* MASTER SYSTEM SWITCH */}
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl glass-effect border border-white/10 shadow-lg">
            <Power className={gestureControlEnabled ? 'w-5 h-5 text-green-400' : 'w-5 h-5 text-muted-foreground'} />
            <span className="text-sm font-medium text-white">Gesture Control</span>
            <Switch
              checked={gestureControlEnabled}
              onCheckedChange={setGestureControlEnabled}
              className="data-[state=checked]:bg-violet-500"
            />
          </div>
        </div>
      </motion.div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatusCard
          title="System Status"
          value={gestureControlEnabled ? 'Active' : 'Standby'}
          subtitle="Gesture Engine"
          icon={Activity}
          status={gestureControlEnabled ? 'active' : 'idle'}
        />
        <StatusCard
          title="Camera"
          value={gestureControlEnabled ? 'Connected' : 'Disconnected'}
          subtitle="Live feed active"
          icon={Camera}
          status={gestureControlEnabled ? 'ready' : 'error'}
        />
        <StatusCard
          title="Model Status"
          value="Ready"
          subtitle="MediaPipe Tracking"
          icon={Zap}
          status="ready"
        />
        <StatusCard
          title="Gestures Detected"
          value={systemStatus.gesturesDetected.toLocaleString()}
          subtitle="Total processed"
          icon={TrendingUp}
          status="active"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Camera Column */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Live Detection Feed
              </h2>
              <p className="text-sm text-muted-foreground">Real-time gesture recognition</p>
            </div>
            {/* Camera turns off when Master Toggle is off */}
            <CameraFeed isActive={gestureControlEnabled} />
          </motion.div>
        </div>

        {/* Activity Log Column */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Recent Activity
              </h2>
              <p className="text-sm text-muted-foreground">Latest gesture triggers</p>
            </div>
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              <ActivityLog activities={recentActivity} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}