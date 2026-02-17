import { motion } from 'framer-motion';
import { betaFeatures } from '@/data/mockData';
import { Code2, Focus, Layers, Link, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const iconMap = {
  Code2,
  Focus,
  Layers,
  Link
};

const getStatusColor = (status) => {
  switch (status) {
    case 'active':
      return 'bg-green-500/10 text-green-400 border-green-500/30';
    case 'beta':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    case 'coming-soon':
      return 'bg-violet-500/10 text-violet-400 border-violet-500/30';
    default:
      return 'bg-white/10 text-muted-foreground border-white/10';
  }
};

export default function BetaFeatures() {
  const [features, setFeatures] = useState(betaFeatures);

  const handleToggle = (id) => {
    setFeatures(prev =>
      prev.map(f => f.id === id && f.status !== 'coming-soon' ? { ...f, enabled: !f.enabled } : f)
    );
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-violet-400" />
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Beta Features
          </h1>
        </div>
        <p className="text-muted-foreground">Experimental gestures and advanced capabilities</p>
      </motion.div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 p-4 rounded-xl bg-violet-500/10 border border-violet-500/30"
      >
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-violet-400 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-violet-400 mb-1">Early Access Features</p>
            <p className="text-sm text-muted-foreground">
              These features are in development and may be unstable. Your feedback helps us improve!
            </p>
          </div>
        </div>
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {features.map((feature, index) => {
          const Icon = iconMap[feature.icon] || Layers;
          const isComingSoon = feature.status === 'coming-soon';
          
          return (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'relative overflow-hidden rounded-xl border bg-[#18181B] p-6 transition-all duration-300',
                isComingSoon ? 'border-white/5 opacity-70' : 'border-white/5 hover:border-violet-500/30'
              )}
            >
              {/* Background gradient */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <Icon className="w-6 h-6 text-violet-400" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={cn('uppercase text-xs font-semibold border', getStatusColor(feature.status))}>
                      {feature.status.replace('-', ' ')}
                    </Badge>
                    {!isComingSoon && (
                      <Switch
                        checked={feature.enabled || false}
                        onCheckedChange={() => handleToggle(feature.id)}
                        className="data-[state=checked]:bg-violet-500"
                      />
                    )}
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {feature.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {feature.description}
                </p>
                
                {feature.status === 'beta' && (
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-muted-foreground">
                      ⚠️ Beta feature - may have bugs or limitations
                    </p>
                  </div>
                )}
                
                {isComingSoon && (
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-violet-400 font-medium">
                      🚀 Coming in the next update
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Roadmap Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-12"
      >
        <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
          What's Next?
        </h2>
        <div className="space-y-3">
          {[
            'Voice command integration with gesture control',
            'Multi-hand gesture support for complex commands',
            'Custom gesture scripting and automation',
            'Cross-platform gesture sync (mobile + desktop)',
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-[#18181B] border border-white/5"
            >
              <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <span className="text-sm font-semibold text-violet-400">{index + 1}</span>
              </div>
              <p className="text-sm text-muted-foreground">{item}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}