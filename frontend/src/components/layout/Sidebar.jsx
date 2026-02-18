import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Hand, 
  Settings as SettingsIcon,
  PlusCircle,
  BrainCircuit,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sidebar = () => {
  const navItems = [
    { name: 'Overview', icon: LayoutDashboard, path: '/' },
    { name: 'Gesture Library', icon: Hand, path: '/gestures' },
    { name: 'Add Gesture', icon: PlusCircle, path: '/add-gesture' },
    { name: 'Retrain Model', icon: BrainCircuit, path: '/retrain' },
    { name: 'Beta Features', icon: Sparkles, path: '/beta' },
    { name: 'Settings', icon: SettingsIcon, path: '/settings' },
  ];

  return (
    // FIX: Use semantic color classes here
    <div className="w-64 bg-card border-r border-border flex flex-col transition-colors duration-300">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Hand className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
            GestureOS
          </span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-violet-500/10 text-violet-400 font-medium" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-violet-400">System Active</span>
          </div>
          <p className="text-[10px] text-muted-foreground">v2.4.0 (Stable)</p>
        </div>
      </div>
    </div>
  );
};