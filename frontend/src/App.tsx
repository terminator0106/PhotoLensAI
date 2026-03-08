import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Landing } from './pages/Landing';
import { Gallery } from './pages/Gallery';
import { Albums } from './pages/Albums';
import { Memories } from './pages/Memories';
import { Upload } from './pages/Upload';
import { MapView } from './pages/Map';
import { NeuralNetworkBackground } from './components/NeuralNetworkBackground';
import { CommandPalette } from './components/CommandPalette';
import { FloatingUploadButton } from './components/FloatingUploadButton';
import { RequireAuth } from './components/RequireAuth';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen bg-[#0A0A0A] text-[#E5E5E5] selection:bg-primary/30 relative">
          <NeuralNetworkBackground />
          <div className="fixed inset-0 bg-grid-pattern pointer-events-none opacity-20" />
          <div className="fixed inset-0 bg-gradient-to-b from-transparent via-[#0A0A0A]/80 to-[#0A0A0A] pointer-events-none" />
          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/gallery" element={<RequireAuth><Gallery /></RequireAuth>} />
                <Route path="/albums" element={<RequireAuth><Albums /></RequireAuth>} />
                <Route path="/memories" element={<RequireAuth><Memories /></RequireAuth>} />
                <Route path="/map" element={<RequireAuth><MapView /></RequireAuth>} />
                <Route path="/upload" element={<RequireAuth><Upload /></RequireAuth>} />
              </Routes>
            </main>
            <Footer />
          </div>
        </div>
        <CommandPalette />
        <FloatingUploadButton />
      </Router>
    </AuthProvider>
  );
}
