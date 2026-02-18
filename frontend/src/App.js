import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// MATCHING IMPORT: Uses curly braces because Layout.jsx uses 'export const'
import { Layout } from '@/components/layout/Layout'; 
import Overview from '@/pages/Overview';
import GestureLibrary from '@/pages/GestureLibrary';
import AddGesture from '@/pages/AddGesture';
import RetrainModel from '@/pages/RetrainModel';
import BetaFeatures from '@/pages/BetaFeatures';
import Settings from '@/pages/Settings';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

function App() {
  return (
    // Global Theme Classes applied here
    <div className="App min-h-screen bg-background text-foreground transition-colors duration-300">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/gestures" element={<GestureLibrary />} />
            <Route path="/add-gesture" element={<AddGesture />} />
            <Route path="/retrain" element={<RetrainModel />} />
            <Route path="/beta" element={<BetaFeatures />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;