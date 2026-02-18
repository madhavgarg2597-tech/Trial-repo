import { motion } from 'framer-motion';
import { Activity, Camera, Zap, TrendingUp, Power } from 'lucide-react';
import { StatusCard } from '@/components/dashboard/StatusCard';
import CameraFeed from '@/components/dashboard/CameraFeed';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function Overview() {
  const [isSystemActive, setIsSystemActive] = useState(false);
  const [activities, setActivities] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    try {
      // FIX: Use 127.0.0.1
      const statusRes = await fetch('http://127.0.0.1:8000/api/engine/status');
      const statusData = await statusRes.json();
      setIsSystemActive(statusData.running);
      setTotalCount(statusData.count || 0);

      // FIX: Fetch Activity Log
      const activityRes = await fetch('http://127.0.0.1:8000/api/activity');
      const activityData = await activityRes.json();
      if (Array.isArray(activityData)) setActivities(activityData);

    } catch (e) {
      console.error("Sync failed");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSystem = async (checked) => {
    setIsLoading(true);
    const endpoint = checked ? 'start' : 'stop';
    try {
      // FIX: Use 127.0.0.1
      const res = await fetch(`http://127.0.0.1:8000/api/engine/${endpoint}`, { method: 'POST' });
      if (res.ok) {
        setIsSystemActive(checked);
        toast.success(checked ? "System Started" : "System Stopped");
      } else {
        toast.error("Failed to toggle system");
      }
    } catch (e) {
      toast.error("Backend unavailable");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Control Dashboard</h1>
            <p className="text-muted-foreground">Monitor and manage your gesture-based desktop control</p>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl glass-effect border border-white/10 shadow-lg bg-[#18181B]/50 backdrop-blur-md">
            <Power className={isSystemActive ? 'w-5 h-5 text-green-400' : 'w-5 h-5 text-muted-foreground'} />
            <span className="text-sm font-medium text-white">Gesture Control</span>
            <Switch checked={isSystemActive} onCheckedChange={toggleSystem} disabled={isLoading} className="data-[state=checked]:bg-violet-600" />
          </div>
        </div>
      </motion.div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatusCard title="System Status" value={isSystemActive ? 'Active' : 'Standby'} subtitle="Gesture Engine" icon={Activity} status={isSystemActive ? 'active' : 'idle'} />
        <StatusCard title="Camera" value={isSystemActive ? 'Streaming' : 'Offline'} subtitle="Live feed status" icon={Camera} status={isSystemActive ? 'ready' : 'error'} />
        <StatusCard title="Model Status" value="Ready" subtitle="MediaPipe Tracking" icon={Zap} status="ready" />
        <StatusCard title="Gestures Detected" value={totalCount.toLocaleString()} subtitle="Session Total" icon={TrendingUp} status="active" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Live Detection Feed</h2>
              <p className="text-sm text-muted-foreground">Real-time gesture recognition</p>
            </div>
            <CameraFeed isSystemActive={isSystemActive} />
          </motion.div>
        </div>
        <div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Recent Activity</h2>
              <p className="text-sm text-muted-foreground">Latest gesture triggers</p>
            </div>
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              <ActivityLog activities={activities} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}