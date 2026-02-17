import { motion } from 'framer-motion';
import { useState } from 'react';
import { Activity, CheckCircle, AlertCircle, TrendingUp, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const TRAINING_STAGES = [
  { id: 1, name: 'Preparing Data', description: 'Loading gesture samples' },
  { id: 2, name: 'Training', description: 'Neural network training in progress' },
  { id: 3, name: 'Validating', description: 'Testing model accuracy' },
  { id: 4, name: 'Complete', description: 'Model deployed successfully' },
];

export default function RetrainModel() {
  const [isTraining, setIsTraining] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [trainingComplete, setTrainingComplete] = useState(false);
  const [metrics, setMetrics] = useState({
    accuracy: 0,
    loss: 0,
    samples: 0
  });

  const handleStartTraining = () => {
    setIsTraining(true);
    setProgress(0);
    setCurrentStage(1);
    setTrainingComplete(false);

    // Simulate training progress
    let stage = 1;
    let prog = 0;
    const interval = setInterval(() => {
      prog += 2;
      setProgress(prog);

      // Update metrics during training
      if (stage === 2) {
        setMetrics({
          accuracy: Math.min(95, 70 + prog * 0.25),
          loss: Math.max(0.05, 2 - prog * 0.019),
          samples: Math.floor(1000 + prog * 5)
        });
      }

      // Progress through stages
      if (prog >= 25 && stage === 1) {
        stage = 2;
        setCurrentStage(2);
      } else if (prog >= 75 && stage === 2) {
        stage = 3;
        setCurrentStage(3);
      } else if (prog >= 95 && stage === 3) {
        stage = 4;
        setCurrentStage(4);
      }

      if (prog >= 100) {
        clearInterval(interval);
        setIsTraining(false);
        setTrainingComplete(true);
        setMetrics({
          accuracy: 94.7,
          loss: 0.08,
          samples: 1500
        });
      }
    }, 80);
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Retrain Model
        </h1>
        <p className="text-muted-foreground">Update the gesture recognition model with latest data</p>
      </motion.div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Current Model Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          <div className="p-4 rounded-xl bg-[#18181B] border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <TrendingUp className="w-4 h-4 text-violet-400" />
              </div>
              <span className="text-sm text-muted-foreground">Current Accuracy</span>
            </div>
            <p className="text-2xl font-bold text-white">92.4%</p>
          </div>
          <div className="p-4 rounded-xl bg-[#18181B] border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <Database className="w-4 h-4 text-violet-400" />
              </div>
              <span className="text-sm text-muted-foreground">Training Samples</span>
            </div>
            <p className="text-2xl font-bold text-white">1,247</p>
          </div>
          <div className="p-4 rounded-xl bg-[#18181B] border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <Activity className="w-4 h-4 text-violet-400" />
              </div>
              <span className="text-sm text-muted-foreground">Last Trained</span>
            </div>
            <p className="text-2xl font-bold text-white">3h ago</p>
          </div>
        </motion.div>

        {/* Training Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-[#18181B] p-8"
        >
          {/* Training Stages */}
          <div className="mb-8">
            <div className="space-y-4">
              {TRAINING_STAGES.map((stage) => {
                const isActive = currentStage === stage.id;
                const isComplete = currentStage > stage.id;
                const isUpcoming = currentStage < stage.id;

                return (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: stage.id * 0.1 }}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border transition-all duration-300',
                      isActive && 'bg-violet-500/10 border-violet-500/30 neon-glow',
                      isComplete && 'bg-green-500/10 border-green-500/30',
                      isUpcoming && 'bg-white/5 border-white/10'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                      isActive && 'bg-violet-500 animate-pulse',
                      isComplete && 'bg-green-500',
                      isUpcoming && 'bg-white/10'
                    )}>
                      {isComplete ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : isActive ? (
                        <Activity className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground">{stage.id}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        'font-semibold transition-colors',
                        (isActive || isComplete) ? 'text-white' : 'text-muted-foreground'
                      )}>
                        {stage.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{stage.description}</p>
                    </div>
                    {isActive && (
                      <div className="text-sm font-medium text-violet-400">
                        {progress}%
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Progress Bar */}
          {isTraining && (
            <div className="mb-6">
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Training Metrics */}
          {(isTraining || trainingComplete) && currentStage >= 2 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <h3 className="text-sm font-semibold text-white mb-3">Training Metrics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
                  <p className="text-lg font-bold text-green-400">{metrics.accuracy.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Loss</p>
                  <p className="text-lg font-bold text-yellow-400">{metrics.loss.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Samples</p>
                  <p className="text-lg font-bold text-violet-400">{metrics.samples}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Success Message */}
          {trainingComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm font-semibold text-green-400">Training Complete!</p>
                <p className="text-xs text-muted-foreground">Model deployed and ready for use</p>
              </div>
            </motion.div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleStartTraining}
            disabled={isTraining}
            className="w-full h-12 bg-violet-500 hover:bg-violet-600 text-white font-semibold neon-glow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTraining ? (
              <>
                <Activity className="w-5 h-5 mr-2 animate-spin" />
                Training in Progress...
              </>
            ) : trainingComplete ? (
              'Start New Training'
            ) : (
              'Start Retraining'
            )}
          </Button>
        </motion.div>

        {/* Warning */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-400 mb-1">Note</p>
            <p className="text-sm text-muted-foreground">
              Retraining will temporarily disable gesture recognition for 2-3 minutes. Ensure you have enough training samples for optimal results.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}