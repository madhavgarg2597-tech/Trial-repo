import React, { useState } from 'react';
import { Sidebar } from './Sidebar'; // Importing Named Export

export const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden transition-colors duration-300">
      {/* Pass state to Sidebar */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <main className="flex-1 overflow-y-auto custom-scrollbar bg-background text-foreground">
        {children}
      </main>
    </div>
  );
};  