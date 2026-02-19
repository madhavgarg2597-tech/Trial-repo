import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Hand, 
  Settings as SettingsIcon,
  PlusCircle,
  BrainCircuit,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sidebar = ({ collapsed, setCollapsed }) => {
  const navItems = [
    { name: 'Overview', icon: LayoutDashboard, path: '/' },
    { name: 'Gesture Library', icon: Hand, path: '/gestures' }, // Note: Path matches your App.js route
    { name: 'Add Gesture', icon: PlusCircle, path: '/add-gesture' },
    { name: 'Retrain Model', icon: BrainCircuit, path: '/retrain' },
    { name: 'Beta Features', icon: Sparkles, path: '/beta' },
    { name: 'Settings', icon: SettingsIcon, path: '/settings' },
  ];

  return (
    <div 
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* HEADER */}
      <div className="p-4 border-b border-border flex items-center justify-between h-16">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
              <Hand className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">
              CrossLINK
            </span>
          </div>
        )}
        
        {/* Toggle Button */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
            collapsed ? "mx-auto" : ""
          )}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 p-4 space-y-2 overflow-x-hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-violet-500/10 text-violet-400 font-medium" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed ? "justify-center" : ""
              )
            }
            title={collapsed ? item.name : ""}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            
            {/* Label - Smooth Hide */}
            <span 
              className={cn(
                "whitespace-nowrap overflow-hidden transition-all duration-300",
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}
            >
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* FOOTER */}
      <div className="p-4 border-t border-border">
        {!collapsed ? (
          <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-violet-400">System Active</span>
            </div>
            <p className="text-[10px] text-muted-foreground">v2.4.0 (Stable)</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="System Active" />
          </div>
        )}
      </div>
    </div>
  );
};