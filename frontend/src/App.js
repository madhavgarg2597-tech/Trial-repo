import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// FIX 1: Default import (No curly braces)
import Layout from '@/components/layout/Layout'; 
import Overview from '@/pages/Overview';
import GestureLibrary from '@/pages/GestureLibrary'; // Ensure this matches your file name
import AddGesture from '@/pages/AddGesture';
import RetrainModel from '@/pages/RetrainModel';
import BetaFeatures from '@/pages/BetaFeatures';
import Settings from '@/pages/Settings';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* FIX 2: Layout Route Pattern for <Outlet /> to work */}
          <Route element={<Layout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/library" element={<GestureLibrary />} /> {/* Adjusted path to match Sidebar */}
            <Route path="/add-gesture" element={<AddGesture />} />
            <Route path="/retrain" element={<RetrainModel />} />
            <Route path="/beta" element={<BetaFeatures />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;