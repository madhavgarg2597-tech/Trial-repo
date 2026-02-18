import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MousePointer2, Eye, Mic, AlertCircle, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const BetaFeatures = () => {
  const [error, setError] = useState(null);
  
  // 1. DEFINE FEATURES (Mouse is real, others are placeholders)
  const [features, setFeatures] = useState([
    {
      id: 'mouse_beta',
      name: 'Virtual Mouse (Beta)',
      description: 'Control cursor with Index finger. Pinch to click. Middle+Thumb for Right Click.',
      icon: MousePointer2,
      status: 'Beta',
      enabled: false,
      connectsToBackend: true
    },
    {
      id: 'gaze_control',
      name: 'Gaze Control (Alpha)',
      description: 'Navigate using eye movements. (Coming Soon)',
      icon: Eye,
      status: 'Alpha',
      enabled: false,
      connectsToBackend: false 
    },
    {
      id: 'voice_cmds',
      name: 'Voice Commands',
      description: 'Execute system tasks using voice keywords.',
      icon: Mic,
      status: 'Planned',
      enabled: false,
      connectsToBackend: false
    }
  ]);

  // 2. FETCH STATUS FROM PORT 8000 (FastAPI)
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Pointing to port 8000 now
        const res = await fetch('http://localhost:8000/api/gestures');
        if (!res.ok) throw new Error('Backend not connected');
        
        const data = await res.json();
        
        // Update only the features that actually exist on the backend
        setFeatures(prev => prev.map(f => {
          // server.py returns a list like [{id: "mouse_beta", enabled: true}, ...]
          const backendSetting = data.find(g => g.id === f.id);
          return backendSetting ? { ...f, enabled: backendSetting.enabled } : f;
        }));
        setError(null);
      } catch (err) {
        console.warn("Backend poll failed:", err.message);
        // We don't set error state immediately to avoid flashing red alerts on load
        // But if it persists or user clicks, we show it below
      }
    };

    fetchStatus();
    // Poll every 2 seconds to keep UI in sync
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // 3. TOGGLE HANDLER (PATCH REQUEST)
  const toggleFeature = async (id, currentObj) => {
    // Don't try to toggle the "Planned" features
    if (!currentObj.connectsToBackend) return;

    const newState = !currentObj.enabled;
    
    // Optimistic UI Update (Change switch immediately)
    setFeatures(prev => prev.map(f => 
      f.id === id ? { ...f, enabled: newState } : f
    ));

    try {
      // Send PATCH to FastAPI (Port 8000)
      const res = await fetch(`http://localhost:8000/api/gestures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState })
      });
      
      if (!res.ok) throw new Error("Failed to update");
      
    } catch (error) {
      console.error("Toggle failed:", error);
      setError("Failed to save setting. Is 'server.py' running on Port 8000?");
      // Revert UI if failed
      setFeatures(prev => prev.map(f => 
        f.id === id ? { ...f, enabled: !newState } : f
      ));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-400" />
            Labs & Beta
          </h2>
          <p className="text-gray-400 mt-2">Test experimental features before they hit the main release.</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-900/50 border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => (
          <Card 
            key={feature.id} 
            className={`
              border-gray-800 transition-all duration-200
              ${feature.enabled ? 'bg-purple-900/20 border-purple-500/50' : 'bg-gray-900/50 hover:border-gray-700'}
            `}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-medium text-white flex items-center gap-2">
                <feature.icon className={`h-5 w-5 ${feature.enabled ? 'text-purple-400' : 'text-gray-500'}`} />
                {feature.name}
              </CardTitle>
              <Badge variant="outline" className={`
                ${feature.status === 'Beta' ? 'text-yellow-400 border-yellow-400/30' : 
                  feature.status === 'Alpha' ? 'text-orange-400 border-orange-400/30' :
                  'text-blue-400 border-blue-400/30'}
              `}>
                {feature.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mt-4">
                <CardDescription className="text-gray-400 max-w-[80%] leading-relaxed">
                  {feature.description}
                </CardDescription>
                <Switch 
                  checked={feature.enabled}
                  onCheckedChange={() => toggleFeature(feature.id, feature)}
                  disabled={!feature.connectsToBackend}
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