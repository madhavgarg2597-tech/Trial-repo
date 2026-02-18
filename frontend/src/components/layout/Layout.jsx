import { Sidebar } from './Sidebar';

export const Layout = ({ children }) => {
  return (
    // FIX: Use 'bg-background' instead of hardcoded hex
    <div className="flex h-screen bg-background overflow-hidden transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
};