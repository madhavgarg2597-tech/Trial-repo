import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import Overview from '@/pages/Overview';
import GestureLibrary from '@/pages/GestureLibrary';
import AddGesture from '@/pages/AddGesture';
import ActionMapping from '@/pages/ActionMapping';
import RetrainModel from '@/pages/RetrainModel';
import BetaFeatures from '@/pages/BetaFeatures';
import Settings from '@/pages/Settings';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/gestures" element={<GestureLibrary />} />
            <Route path="/add-gesture" element={<AddGesture />} />
            <Route path="/actions" element={<ActionMapping />} />
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