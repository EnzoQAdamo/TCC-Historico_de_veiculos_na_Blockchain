import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import HomePage from './components/HomePage';
import DealerPanel from './components/DealerPanel';
import InsurancePanel from './components/InsurancePanel';
import WorkshopPanel from './components/WorkshopPanel';
import ManufacturerPanel from './components/ManufacturerPanel';
import DMVPanel from './components/DMVPanel';
import PublicSearch from './components/PublicSearch';
import AdminPanel from './components/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

function App() {
  return (
    <ToastProvider>
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navigation />
          
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<PublicSearch />} />
              
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requiredRole="Administrador">
                    <AdminPanel />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/manufacturer" 
                element={
                  <ProtectedRoute requiredRole="Montadora">
                    <ManufacturerPanel />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/dmv" 
                element={
                  <ProtectedRoute requiredRole="DETRAN">
                    <DMVPanel />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/workshop" 
                element={
                  <ProtectedRoute requiredRole="Oficina">
                    <WorkshopPanel />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/insurance" 
                element={
                  <ProtectedRoute requiredRole="Seguradora">
                    <InsurancePanel />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/dealer" 
                element={
                  <ProtectedRoute requiredRole="Concessionária">
                    <DealerPanel />
                  </ProtectedRoute>
                } 
              />

              {/* Fallback para 404 ou Redirecionamento */}
              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>
          
          <footer className="bg-white border-t border-gray-100 py-8 text-center text-gray-400 text-xs">
            © 2024 Registro Veicular Blockchain - Sistema Descentralizado e Auditável
          </footer>
        </div>
      </Router>
    </AuthProvider>
    </ToastProvider>
  );
}

export default App;