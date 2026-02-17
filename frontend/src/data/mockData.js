export const systemStatus = {
  isActive: true,
  cameraConnected: true,
  modelStatus: 'ready',
  lastSync: new Date().toISOString(),
  confidence: 94.2,
  gesturesDetected: 1247,
  uptime: '3h 42m'
};

export const staticGestures = [
  {
    id: 'palm-open',
    name: 'Palm Open',
    type: 'static',
    action: 'Screenshot',
    confidence: 96.8,
    enabled: true,
    thumbnail: 'https://images.unsplash.com/photo-1740503774310-6f6052695a58?crop=entropy&cs=srgb&fm=jpg&q=85',
    keyBinding: 'Ctrl+Shift+S',
    cooldown: 1000
  },
  {
    id: 'fist',
    name: 'Fist',
    type: 'static',
    action: 'Pause/Play Media',
    confidence: 94.3,
    enabled: true,
    thumbnail: 'https://images.unsplash.com/photo-1637496836363-f50eb91e9889?crop=entropy&cs=srgb&fm=jpg&q=85',
    keyBinding: 'Space',
    cooldown: 500
  },
  {
    id: 'thumbs-up',
    name: 'Thumbs Up',
    type: 'static',
    action: 'Volume Up',
    confidence: 92.1,
    enabled: true,
    thumbnail: 'https://images.unsplash.com/photo-1697534539729-2b772edcb49e?crop=entropy&cs=srgb&fm=jpg&q=85',
    keyBinding: 'Volume+',
    cooldown: 300
  },
  {
    id: 'peace',
    name: 'Peace Sign',
    type: 'static',
    action: 'Switch Virtual Desktop',
    confidence: 89.5,
    enabled: false,
    thumbnail: 'https://images.unsplash.com/photo-1568654385189-49c3e9cdba5a?crop=entropy&cs=srgb&fm=jpg&q=85',
    keyBinding: 'Ctrl+Win+Right',
    cooldown: 2000
  }
];

export const movementGestures = [
  {
    id: 'swipe-down',
    name: 'Swipe Down',
    type: 'movement',
    action: 'Take Screenshot',
    confidence: 91.2,
    enabled: true,
    sensitivity: 75,
    cooldown: 1500,
    description: 'Quick downward hand motion'
  },
  {
    id: 'swipe-horizontal',
    name: 'Horizontal Swipe',
    type: 'movement',
    action: 'Switch Browser Tab',
    confidence: 88.7,
    enabled: true,
    sensitivity: 65,
    cooldown: 800,
    description: 'Left/right hand sweep'
  },
  {
    id: 'circle-motion',
    name: 'Circular Motion',
    type: 'movement',
    action: 'Undo (Ctrl+Z)',
    confidence: 85.3,
    enabled: true,
    sensitivity: 70,
    cooldown: 1000,
    description: 'Clockwise or counter-clockwise circle'
  },
  {
    id: 'scroll-joystick',
    name: 'Scroll Joystick',
    type: 'movement',
    action: 'Analog Scrolling',
    confidence: 93.8,
    enabled: true,
    sensitivity: 80,
    cooldown: 100,
    description: 'Continuous vertical scrolling control'
  },
  {
    id: 'pinch-zoom',
    name: '5-Finger Pinch',
    type: 'movement',
    action: 'Zoom In/Out',
    confidence: 87.4,
    enabled: true,
    sensitivity: 60,
    cooldown: 500,
    description: 'Pinch all fingers together'
  },
  {
    id: 'three-finger-pinch',
    name: '3-Finger Pinch',
    type: 'movement',
    action: 'Copy/Paste',
    confidence: 84.9,
    enabled: false,
    sensitivity: 55,
    cooldown: 1200,
    description: 'Three fingers pinch motion'
  }
];

export const recentActivity = [
  {
    id: 1,
    gesture: 'Swipe Down',
    action: 'Screenshot taken',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    confidence: 94.2,
    success: true
  },
  {
    id: 2,
    gesture: 'Fist',
    action: 'Media paused',
    timestamp: new Date(Date.now() - 245000).toISOString(),
    confidence: 96.1,
    success: true
  },
  {
    id: 3,
    gesture: 'Horizontal Swipe',
    action: 'Tab switched',
    timestamp: new Date(Date.now() - 380000).toISOString(),
    confidence: 89.3,
    success: true
  },
  {
    id: 4,
    gesture: 'Thumbs Up',
    action: 'Volume increased',
    timestamp: new Date(Date.now() - 520000).toISOString(),
    confidence: 92.7,
    success: true
  },
  {
    id: 5,
    gesture: 'Circle Motion',
    action: 'Undo triggered',
    timestamp: new Date(Date.now() - 680000).toISOString(),
    confidence: 78.4,
    success: false
  }
];

export const betaFeatures = [
  {
    id: 'pointer-gesture',
    name: 'Pointer Gesture',
    description: 'Point and execute code with a single gesture',
    status: 'beta',
    icon: 'Code2'
  },
  {
    id: 'shhh-gesture',
    name: 'Shhh Gesture',
    description: 'Activate focus mode by placing finger on lips',
    status: 'coming-soon',
    icon: 'Focus'
  },
  {
    id: 'multi-finger-swipe',
    name: 'Multi-Finger Swipe',
    description: 'Advanced screenshot with 4-finger swipe',
    status: 'active',
    icon: 'Layers'
  },
  {
    id: 'gesture-chaining',
    name: 'Gesture Chaining',
    description: 'Combine multiple gestures into macros',
    status: 'coming-soon',
    icon: 'Link'
  }
];

export const availableActions = [
  { value: 'screenshot', label: 'Take Screenshot', category: 'System' },
  { value: 'copy', label: 'Copy (Ctrl+C)', category: 'Clipboard' },
  { value: 'paste', label: 'Paste (Ctrl+V)', category: 'Clipboard' },
  { value: 'undo', label: 'Undo (Ctrl+Z)', category: 'Edit' },
  { value: 'redo', label: 'Redo (Ctrl+Y)', category: 'Edit' },
  { value: 'media-play', label: 'Play/Pause Media', category: 'Media' },
  { value: 'volume-up', label: 'Volume Up', category: 'Media' },
  { value: 'volume-down', label: 'Volume Down', category: 'Media' },
  { value: 'tab-next', label: 'Next Browser Tab', category: 'Browser' },
  { value: 'tab-prev', label: 'Previous Browser Tab', category: 'Browser' },
  { value: 'tab-close', label: 'Close Tab', category: 'Browser' },
  { value: 'zoom-in', label: 'Zoom In', category: 'View' },
  { value: 'zoom-out', label: 'Zoom Out', category: 'View' },
  { value: 'desktop-switch', label: 'Switch Virtual Desktop', category: 'System' },
  { value: 'run-code', label: 'Run Code (VS Code)', category: 'Developer' },
  { value: 'focus-mode', label: 'Enable Focus Mode', category: 'Productivity' }
];