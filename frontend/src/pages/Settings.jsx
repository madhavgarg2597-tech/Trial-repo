import { motion } from 'framer-motion';
import { Moon, Sun, Bell, Shield, Zap, Sliders } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useTheme } from "@/components/theme-provider";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const [notifications, setNotifications] = useState(true);
  const [autoRetrain, setAutoRetrain] = useState(false);
  const [detectionSensitivity, setDetectionSensitivity] = useState(75);
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);

  return (
    <div className="min-h-screen p-8 bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Settings
        </h1>
        <p className="text-muted-foreground">Customize your gesture control experience</p>
      </motion.div>

      <div className="max-w-3xl space-y-6">
        
        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              {isDark ? <Moon className="w-5 h-5 text-violet-400" /> : <Sun className="w-5 h-5 text-orange-500" />}
            </div>
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Appearance</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-1">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
              </div>
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                className="data-[state=checked]:bg-violet-500"
              />
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Bell className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Notifications</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-1">Enable Notifications</p>
                <p className="text-xs text-muted-foreground">Receive alerts for gesture triggers and system events</p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
                className="data-[state=checked]:bg-violet-500"
              />
            </div>
          </div>
        </motion.div>

        {/* Model Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Model Settings</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-1">Auto Retrain</p>
                <p className="text-xs text-muted-foreground">Automatically retrain model with new gesture data</p>
              </div>
              <Switch
                checked={autoRetrain}
                onCheckedChange={setAutoRetrain}
                className="data-[state=checked]:bg-violet-500"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Confidence Threshold</p>
                <span className="text-sm font-semibold text-violet-400">{confidenceThreshold}%</span>
              </div>
              <Slider
                value={[confidenceThreshold]}
                onValueChange={(value) => setConfidenceThreshold(value[0])}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Minimum confidence required to trigger gesture actions
              </p>
            </div>
          </div>
        </motion.div>

        {/* Detection Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Sliders className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Detection Settings</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Detection Sensitivity</p>
                <span className="text-sm font-semibold text-violet-400">{detectionSensitivity}%</span>
              </div>
              <Slider
                value={[detectionSensitivity]}
                onValueChange={(value) => setDetectionSensitivity(value[0])}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Higher sensitivity detects gestures faster but may trigger false positives
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Camera Resolution</p>
              <Select defaultValue="720p">
                <SelectTrigger className="bg-background border-input focus:border-violet-500/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="480p">480p (Fast)</SelectItem>
                  <SelectItem value="720p">720p (Balanced)</SelectItem>
                  <SelectItem value="1080p">1080p (High Quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Privacy & Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Shield className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Privacy & Security</h2>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">
                All gesture data is processed locally on your device. Camera feed is never stored or transmitted.
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}