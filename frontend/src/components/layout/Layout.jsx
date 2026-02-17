import { Sidebar } from './Sidebar';

export const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
};