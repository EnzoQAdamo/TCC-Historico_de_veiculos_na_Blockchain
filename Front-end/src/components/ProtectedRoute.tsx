import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isConnected, role, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-gray-600 font-medium">Verificando permissões na Blockchain...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-xl border border-gray-100 text-center animate-fadeIn">
        <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Conexão Necessária</h2>
        <p className="text-gray-600 mb-8">
          Você precisa conectar sua carteira MetaMask para acessar esta área protegida.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para o Início
        </button>
      </div>
    );
  }

  if (requiredRole && role !== requiredRole) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-xl border border-gray-100 text-center animate-fadeIn">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h2>
        <p className="text-gray-600 mb-8">
          Sua carteira identificada como <b>{role || 'Usuário'}</b> não possui permissão para acessar o painel de <b>{requiredRole}</b>.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para o Início
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
