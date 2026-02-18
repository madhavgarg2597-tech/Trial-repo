import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MousePointer2, Eye, Mic, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const BetaFeatures = () => {
  const [error, setError] = useState(null);
  
  // 1. RESTORED OLD FEATURES + NEW MOUSE
  const [features, setFeatures] = useState([
    {
      id: 'mouse_beta',
      name: 'Virtual Mouse (Stable)',
      description: 'New cursor logic: Index to move, Thumb+Middle to Right Click.',
      icon: MousePointer2,
      status: 'Beta',
      enabled: false
    },
    {
      id: 'gaze_tracking',
      name: 'Gaze Control (Alpha)',
      description: 'Control the mouse cursor with your eye movements.',
      icon: Eye,
      status: 'Alpha',
      enabled: false
    },
    {
      id: 'voice_cmds',
      name: 'Voice Commands',
      description: 'Execute system tasks using voice keywords.',
      icon: Mic,
      status: 'Planned',
      enabled: false
    }
  ]);

  // 2. SAFE FETCH (Prevents Crashing)
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/status');
        if (!res.ok) throw new Error('Backend not connected');
        
        const data = await res.json();
        setFeatures(prev => prev.map(f => ({
          ...f,
          // Only update if the backend actually sends data for this ID
          enabled: data.gestures[f.id]?.enabled ?? f.enabled 
        })));
        setError(null);
      } catch (err) {
        console.error("Backend Error:", err);
        setError("Could not connect to Gesture Engine. Is the Python server running?");
      }
    };

    fetchStatus();
    // Poll every 2 seconds to check connection
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleFeature = async (id, currentObj) => {
    const newState = !currentObj.enabled;
    
    // Optimistic UI Update
    setFeatures(prev => prev.map(f => 
      f.id === id ? { ...f, enabled: newState } : f
    ));

    try {
      await fetch('http://localhost:5000/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gesture_id: id,
          config: { enabled: newState }
        })
      });
    } catch (error) {
      console.error("Failed to toggle feature:", error);
      setError("Failed to save setting. Backend disconnected.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Labs & Beta</h2>
          <p className="text-gray-400 mt-2">Test experimental features before they hit the main release.</p>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <Alert variant="destructive" className="bg-red-900/50 border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => (
          <Card key={feature.id} className="bg-gray-900/50 border-gray-800 hover:border-purple-500/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-medium text-white flex items-center gap-2">
                <feature.icon className="h-5 w-5 text-purple-400" />
                {feature.name}
              </CardTitle>
              <Badge variant="outline" className={`
                ${feature.status === 'Beta' ? 'text-yellow-400 border-yellow-400/30' : 'text-blue-400 border-blue-400/30'}
              `}>
                {feature.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mt-4">
                <CardDescription className="text-gray-400 max-w-[80%]">
                  {feature.description}
                </CardDescription>
                <Switch 
                  checked={feature.enabled}
                  onCheckedChange={() => toggleFeature(feature.id, feature)}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BetaFeatures;