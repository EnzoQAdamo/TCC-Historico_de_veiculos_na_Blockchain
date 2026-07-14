import React from 'react';
import { NavLink } from 'react-router-dom';
import { Car, Shield, Wrench, Factory, Building2, Wallet, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navigation: React.FC = () => {
  const { address, role, name, isConnected, connect, logout } = useAuth();

  const allNavItems = [
    { id: 'search', path: '/search', label: 'Consulta Pública', icon: Search, public: true },
    { id: 'admin', path: '/admin', label: 'Administrador', icon: ShieldCheck, role: 'Administrador' },
    { id: 'manufacturer', path: '/manufacturer', label: 'Montadora', icon: Factory, role: 'Montadora' },
    { id: 'dealer', path: '/dealer', label: 'Concessionária', icon: Car, role: 'Concessionária' },
    { id: 'insurance', path: '/insurance', label: 'Seguradora', icon: Shield, role: 'Seguradora' },
    { id: 'dmv', path: '/dmv', label: 'DETRAN', icon: Building2, role: 'DETRAN' },
    { id: 'workshop', path: '/workshop', label: 'Oficina', icon: Wrench, role: 'Oficina' }
  ];

  // Filtra itens baseados no papel (Role) logado
  const navItems = allNavItems.filter(item => {
    if (item.public) return true; // Itens públicos (Início, Dealer)
    if (role === item.role) return true; // Itens específicos da Role
    return false;
  });

  return (
    <nav className="bg-white shadow-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <NavLink to="/" className="flex-shrink-0 flex items-center">
              <Car className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Blockchain Auto
              </span>
            </NavLink>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center mr-4 pr-4 border-r border-gray-100 gap-1 overflow-x-auto max-w-xl no-scrollbar">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) => `
                      flex items-center px-3 py-2 rounded-xl text-sm font-bold transition-all
                      ${isActive
                        ? 'text-indigo-600 bg-indigo-50 shadow-sm border border-indigo-100'
                        : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>

            <div className="flex items-center">
              {isConnected && address ? (
                <div className="flex items-center gap-3">
                  <div className="hidden lg:flex flex-col items-end">
                    <span className="text-[11px] font-black uppercase tracking-tighter text-indigo-600 leading-none">
                      {name || role || 'Conectado'}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                      {role || 'Usuário'} · {address ? `...${address.slice(-6)}` : ''}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all border border-gray-100"
                    title="Desconectar"
                  >
                    <Wallet className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={connect}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  <Wallet className="h-4 w-4" />
                  Conectar Carteira
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;