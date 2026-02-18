import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Hand, Plus, Settings, Activity, Zap, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Overview', href: '/', icon: Home },
  { name: 'Gesture Library', href: '/gestures', icon: Hand },
  { name: 'Add Gesture', href: '/add-gesture', icon: Plus },
  
  { name: 'Retrain Model', href: '/retrain', icon: Activity },
  { name: 'Beta Features', href: '/beta', icon: Layers },
];

export const Sidebar = () => {
  const location = useLocation();

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="fixed left-0 top-0 h-screen w-64 glass-effect border-r border-white/10 flex flex-col z-50"
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center neon-glow">
            <Hand className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">GestureOS</h1>
            <p className="text-xs text-muted-foreground">AI Control System</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative',
                isActive
                  ? 'bg-violet-500/20 text-violet-300 font-medium'
                  : 'text-muted-foreground hover:text-white hover:bg-white/5'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-lg border border-violet-500/30"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className={cn('w-5 h-5 relative z-10', isActive && 'text-violet-400')} />
              <span className="relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-all duration-200"
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Link>
      </div>
    </motion.aside>
  );
};