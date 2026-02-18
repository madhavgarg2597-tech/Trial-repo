import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Hand, 
  Settings, 
  BookOpen, 
  RefreshCw, 
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Sidebar = ({ collapsed, setCollapsed }) => {
  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/' },
    { icon: Hand, label: 'Gesture Library', path: '/library' },
    { icon: Sparkles, label: 'Labs & Beta', path: '/beta' },
    { icon: BookOpen, label: 'Add Gesture', path: '/add-gesture' },
    { icon: RefreshCw, label: 'Retrain Model', path: '/retrain' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div 
      className={`
        h-screen bg-gray-900 border-r border-gray-800 text-white 
        transition-all duration-300 ease-in-out flex flex-col
        ${collapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* HEADER */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between h-16">
        {/* Logo - Hidden when collapsed */}
        {!collapsed && (
          <div className="flex items-center gap-2 font-bold text-xl text-purple-400 whitespace-nowrap overflow-hidden">
            <Hand className="h-6 w-6 flex-shrink-0" />
            <span>GestureOS</span>
          </div>
        )}
        
        {/* Toggle Button */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className={`
            p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors
            ${collapsed ? 'mx-auto' : ''}
          `}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 py-6 space-y-2 px-3 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : ""} // Tooltip when collapsed
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group
              ${isActive 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <item.icon size={22} className="min-w-[22px] flex-shrink-0" />
            
            {/* Label - Smoothly fades out */}
            <span 
              className={`
                whitespace-nowrap overflow-hidden transition-all duration-300
                ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
              `}
            >
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* FOOTER */}
      <div className="p-4 border-t border-gray-800">
        {!collapsed ? (
          <div className="text-xs text-gray-500 whitespace-nowrap">
            v1.0.0 Beta
          </div>
        ) : (
          <div className="text-xs text-center text-gray-500">
            v1
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;