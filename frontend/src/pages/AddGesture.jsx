import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ChevronRight, Camera, Check, Hand, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { availableActions } from '@/data/mockData';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, name: 'Type Selection', icon: Hand },
  { id: 2, name: 'Recording', icon: Camera },
  { id: 3, name: 'Configuration', icon: ChevronRight },
  { id: 4, name: 'Complete', icon: Check },
];

export default function AddGesture() {
  const [currentStep, setCurrentStep] = useState(1);
  const [gestureType, setGestureType] = useState('static');
  const [gestureName, setGestureName] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordingComplete, setRecordingComplete] = useState(false);

  const handleStartRecording = () => {
    setRecording(true);
    setRecordingProgress(0);
    
    // Slower capture: 7 seconds total (increase by 1% every 70ms)
    // For static gestures: captures 5 positions (1.4 seconds each)
    // For movement gestures: smooth continuous capture
    const interval = setInterval(() => {
      setRecordingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setRecording(false);
          setRecordingComplete(true);
          return 100;
        }
        return prev + 1;
      });
    }, 70);
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      if (currentStep === 1) {
        setRecordingComplete(false);
      }
    }
  };

  const handleComplete = () => {
    console.log('Gesture created:', { gestureType, gestureName, selectedAction });
    // Reset form
    setCurrentStep(1);
    setGestureType('static');
    setGestureName('');
    setSelectedAction('');
    setRecordingComplete(false);
  };

  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Add New Gesture
          </h1>
          <p className="text-muted-foreground">Create a custom gesture with Face ID-style precision</p>
        </motion.div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-white/10" />
            <motion.div
              className="absolute top-5 left-0 h-0.5 bg-violet-500"
              initial={{ width: '0%' }}
              animate={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.5 }}
            />

            {STEPS.map((step, index) => (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <motion.div
                  className={cn(
                    'w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2 transition-all duration-300',
                    currentStep > step.id
                      ? 'bg-violet-500 border-violet-500'
                      : currentStep === step.id
                      ? 'bg-violet-500/20 border-violet-500 neon-glow'
                      : 'bg-[#18181B] border-white/10'
                  )}
                  animate={{
                    scale: currentStep === step.id ? [1, 1.1, 1] : 1,
                  }}
                  transition={{ duration: 0.5, repeat: currentStep === step.id ? Infinity : 0 }}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <step.icon className={cn(
                      'w-5 h-5',
                      currentStep === step.id ? 'text-violet-400' : 'text-muted-foreground'
                    )} />
                  )}
                </motion.div>
                <span className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  currentStep >= step.id ? 'text-white' : 'text-muted-foreground'
                )}>
                  {step.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-white/10 bg-[#18181B] p-8"
          >
            {/* Step 1: Type Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Choose Gesture Type
                  </h2>
                  <p className="text-muted-foreground">Select whether this is a static pose or movement-based gesture</p>
                </div>

                <RadioGroup value={gestureType} onValueChange={setGestureType} className="grid grid-cols-2 gap-4">
                  <div>
                    <RadioGroupItem value="static" id="static" className="peer sr-only" />
                    <Label
                      htmlFor="static"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-violet-500/50 peer-data-[state=checked]:border-violet-500 peer-data-[state=checked]:bg-violet-500/10 cursor-pointer transition-all duration-200"
                    >
                      <Hand className="w-12 h-12 mb-4 text-violet-400" />
                      <div className="text-center">
                        <p className="font-semibold text-white mb-1">Static Gesture</p>
                        <p className="text-xs text-muted-foreground">Fixed hand poses</p>
                      </div>
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem value="movement" id="movement" className="peer sr-only" />
                    <Label
                      htmlFor="movement"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-violet-500/50 peer-data-[state=checked]:border-violet-500 peer-data-[state=checked]:bg-violet-500/10 cursor-pointer transition-all duration-200"
                    >
                      <Move className="w-12 h-12 mb-4 text-violet-400" />
                      <div className="text-center">
                        <p className="font-semibold text-white mb-1">Movement Gesture</p>
                        <p className="text-xs text-muted-foreground">Dynamic motions</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Step 2: Recording */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Record Your Gesture
                  </h2>
                  <p className="text-muted-foreground">
                    {gestureType === 'static' 
                      ? 'Move your hand to each highlighted position and hold steady' 
                      : 'Perform the motion slowly from different angles'}
                  </p>
                </div>

                {/* Camera Preview with actual feed mockup */}
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black border border-white/10">
                  {/* Mock camera feed background with noise/grain effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-violet-900/10" />
                  <div className="absolute inset-0" style={{ 
                    backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 1px, transparent 1px)',
                    backgroundSize: '4px 4px'
                  }} />
                  
                  {/* Mock hand silhouette (visible when not recording) */}
                  {!recording && !recordingComplete && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.3 }}
                    >
                      <Hand className="w-32 h-32 text-violet-400/50" />
                    </motion.div>
                  )}

                  {/* Position guides for static gestures */}
                  {gestureType === 'static' && (
                    <>
                      {[
                        { id: 1, pos: 'top-1/3 left-1/3', label: '1' },
                        { id: 2, pos: 'top-1/3 right-1/3', label: '2' },
                        { id: 3, pos: 'top-1/2 left-1/2', label: '3' },
                        { id: 4, pos: 'bottom-1/3 left-1/3', label: '4' },
                        { id: 5, pos: 'bottom-1/3 right-1/3', label: '5' }
                      ].map((guide) => {
                        const captureThreshold = (guide.id - 1) * 20;
                        const isCaptured = recordingProgress > captureThreshold;
                        const isActive = recording && recordingProgress >= captureThreshold && recordingProgress < captureThreshold + 20;
                        
                        return (
                          <motion.div
                            key={guide.id}
                            className={cn(
                              'absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                              guide.pos,
                              isCaptured ? 'bg-green-500/20 border-green-400' :
                              isActive ? 'bg-violet-500/30 border-violet-400 animate-pulse scale-110' :
                              'bg-white/5 border-white/20'
                            )}
                            animate={{
                              scale: isActive ? [1, 1.2, 1] : 1,
                            }}
                            transition={{ duration: 0.5, repeat: isActive ? Infinity : 0 }}
                          >
                            {isCaptured ? (
                              <Check className="w-6 h-6 text-green-400" />
                            ) : (
                              <span className={cn(
                                'text-sm font-bold',
                                isActive ? 'text-violet-400' : 'text-white/40'
                              )}>
                                {guide.label}
                              </span>
                            )}
                          </motion.div>
                        );
                      })}
                    </>
                  )}

                  {/* Recording indicator for movement gestures */}
                  {gestureType === 'movement' && recording && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {/* Motion path guide */}
                      <svg className="w-64 h-64" viewBox="0 0 100 100">
                        <motion.path
                          d="M 20,50 Q 50,20 80,50 Q 50,80 20,50"
                          fill="none"
                          stroke="rgba(124, 58, 237, 0.5)"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                        <motion.circle
                          cx="50"
                          cy="50"
                          r="4"
                          fill="#7C3AED"
                          animate={{
                            cx: [20, 50, 80, 50, 20],
                            cy: [50, 20, 50, 80, 50]
                          }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        />
                      </svg>
                    </motion.div>
                  )}

                  {/* Corner brackets */}
                  <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-violet-400/50" />
                  <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-violet-400/50" />
                  <div className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-violet-400/50" />
                  <div className="absolute bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-violet-400/50" />

                  {/* Progress bar at bottom */}
                  {recording && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                      <motion.div
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
                        initial={{ width: '0%' }}
                        animate={{ width: `${recordingProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}

                  {/* Instruction overlay */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full glass-effect">
                    {recordingComplete ? (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400 font-medium">Capture Complete!</span>
                      </div>
                    ) : recording ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-sm text-white font-medium">
                          {gestureType === 'static' 
                            ? `Position ${Math.floor(recordingProgress / 20) + 1} of 5` 
                            : 'Recording motion...'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-white font-medium">Position your hand in the frame</span>
                    )}
                  </div>

                  {/* Success animation */}
                  {recordingComplete && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center bg-green-500/10"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <motion.div
                        className="w-24 h-24 rounded-full bg-green-500/20 border-4 border-green-400 flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                      >
                        <Check className="w-12 h-12 text-green-400" />
                      </motion.div>
                    </motion.div>
                  )}
                </div>

                {/* Start Recording Button */}
                {!recordingComplete && !recording && (
                  <Button
                    onClick={handleStartRecording}
                    className="w-full h-12 bg-violet-500 hover:bg-violet-600 text-white font-semibold neon-glow"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Start Capture
                  </Button>
                )}

                {/* Capture tips */}
                {!recording && !recordingComplete && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-white/5">
                      <span className="text-violet-400">💡</span>
                      <p className="text-muted-foreground">Move slowly through each position</p>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-white/5">
                      <span className="text-violet-400">✋</span>
                      <p className="text-muted-foreground">Keep hand visible at all times</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Configuration */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Configure Gesture
                  </h2>
                  <p className="text-muted-foreground">Name your gesture and assign an action</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="gesture-name" className="text-white mb-2 block">Gesture Name</Label>
                    <Input
                      id="gesture-name"
                      placeholder="e.g., Swipe Up, Thumbs Up"
                      value={gestureName}
                      onChange={(e) => setGestureName(e.target.value)}
                      className="bg-white/5 border-white/10 focus:border-violet-500/50 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="action" className="text-white mb-2 block">Assigned Action</Label>
                    <Select value={selectedAction} onValueChange={setSelectedAction}>
                      <SelectTrigger className="bg-white/5 border-white/10 focus:border-violet-500/50 text-white">
                        <SelectValue placeholder="Select an action" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#18181B] border-white/10">
                        {availableActions.map((action) => (
                          <SelectItem key={action.value} value={action.value} className="text-white hover:bg-violet-500/20">
                            {action.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {currentStep === 4 && (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto mb-6 neon-glow"
                >
                  <Check className="w-10 h-10 text-green-400" />
                </motion.div>
                <h2 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Gesture Created!
                </h2>
                <p className="text-muted-foreground mb-6">
                  Your new gesture has been added to the library. The model will retrain automatically.
                </p>
                <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <p className="text-sm text-violet-400 font-medium">✨ Model retraining in progress...</p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-8">
              {currentStep > 1 && currentStep < 4 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  Back
                </Button>
              )}
              {currentStep < 4 ? (
                <Button
                  onClick={handleNext}
                  disabled={currentStep === 2 && !recordingComplete}
                  className="flex-1 bg-violet-500 hover:bg-violet-600 text-white font-semibold"
                >
                  {currentStep === 3 ? 'Create Gesture' : 'Continue'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  className="w-full bg-violet-500 hover:bg-violet-600 text-white font-semibold"
                >
                  Add Another Gesture
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}