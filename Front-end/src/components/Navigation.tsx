import React from 'react';
import { Car, Shield, Wrench, Home } from 'lucide-react';

interface NavigationProps {
  currentPanel: string;
  onPanelChange: (panel: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentPanel, onPanelChange }) => {
  const navItems = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'dealer', label: 'Concessionária', icon: Car },
    { id: 'insurance', label: 'Seguradora', icon: Shield },
    { id: 'workshop', label: 'Oficina', icon: Wrench }
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Car className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Sistema Histórico Veicular
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onPanelChange(item.id)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPanel === item.id
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;