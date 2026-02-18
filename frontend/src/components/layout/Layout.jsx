import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar receives state props */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Content - Flex-1 automatically fills remaining space */}
      <main className="flex-1 h-full overflow-y-auto bg-black transition-all duration-300">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;  