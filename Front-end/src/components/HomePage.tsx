import React from 'react';
import { Car, Shield, Wrench, BarChart, Users, Clock } from 'lucide-react';

interface HomePageProps {
  onPanelChange: (panel: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onPanelChange }) => {
  const features = [
    {
      id: 'dealer',
      title: 'Concessionária',
      icon: Car,
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700',
      description: 'Geração rápida de relatórios e gestão do inventário para vendedores',
      features: ['Busca rápida por chassi', 'Relatórios em PDF', 'Gestão de inventário', 'Integração com anúncios']
    },
    {
      id: 'insurance',
      title: 'Seguradora',
      icon: Shield,
      color: 'bg-green-600',
      hoverColor: 'hover:bg-green-700',
      description: 'Análise de risco completa e histórico detalhado de veículos',
      features: ['Score de risco automatizado', 'Histórico de sinistros', 'Análise de proprietários', 'Consultas recentes']
    },
    {
      id: 'workshop',
      title: 'Oficina',
      icon: Wrench,
      color: 'bg-orange-600',
      hoverColor: 'hover:bg-orange-700',
      description: 'Registro simples e eficiente de serviços realizados',
      features: ['Registro rápido de serviços', 'Histórico de manutenções', 'Upload de documentos', 'Busca por veículos']
    }
  ];

  const stats = [
    {
      icon: BarChart,
      value: '15,240',
      label: 'Consultas Realizadas',
      color: 'text-blue-600 bg-blue-50'
    },
    {
      icon: Users,
      value: '1,850',
      label: 'Usuários Ativos',
      color: 'text-green-600 bg-green-50'
    },
    {
      icon: Clock,
      value: '24/7',
      label: 'Disponibilidade',
      color: 'text-orange-600 bg-orange-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-600 rounded-full">
              <Car className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Sistema de Histórico Veicular
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Plataforma completa para consulta e gestão de histórico veicular, 
            oferecendo três painéis especializados para diferentes necessidades do mercado automotivo.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${stat.color} mb-4`}>
                  <Icon className="h-8 w-8" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.id} className="bg-white rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="p-8">
                  <div className={`inline-flex items-center justify-center w-16 h-16 ${feature.color} rounded-full mb-6`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-6">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-2 mb-8">
                    {feature.features.map((item, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => onPanelChange(feature.id)}
                    className={`w-full py-3 px-6 ${feature.color} ${feature.hoverColor} text-white font-semibold rounded-lg transition-colors duration-200 transform hover:scale-105`}
                  >
                    Acessar Painel
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Por que escolher nosso sistema?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Segurança Total</h3>
              <p className="text-sm text-gray-600">Dados protegidos com criptografia de ponta</p>
            </div>
            
            <div className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Análise Avançada</h3>
              <p className="text-sm text-gray-600">Relatórios detalhados e scores de risco</p>
            </div>
            
            <div className="p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Rapidez</h3>
              <p className="text-sm text-gray-600">Consultas instantâneas e interface otimizada</p>
            </div>
            
            <div className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Colaboração</h3>
              <p className="text-sm text-gray-600">Integração perfeita entre todos os stakeholders</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;