import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Shield, Wrench, BarChart, Users, Clock, Factory, Building2, Search } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      id: 'manufacturer',
      path: '/manufacturer',
      title: 'Montadora',
      icon: Factory,
      color: 'bg-indigo-600',
      hoverColor: 'hover:bg-indigo-700',
      description: 'Gestão de novos modelos de veículos e emissão de chassis de fábrica',
      features: ['Registro de Modelos', 'Emissão de novo Chassi', 'Integração de Fábrica']
    },
    {
      id: 'dealer',
      path: '/search',
      title: 'Consulta Pública',
      icon: Search,
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700',
      description: 'Geração rápida de relatórios e gestão do inventário para vendedores',
      features: ['Busca rápida por chassi', 'Relatórios em PDF', 'Gestão de inventário', 'Integração com anúncios']
    },
    {
      id: 'insurance',
      path: '/insurance',
      title: 'Seguradora',
      icon: Shield,
      color: 'bg-green-600',
      hoverColor: 'hover:bg-green-700',
      description: 'Análise de risco completa e histórico detalhado de veículos',
      features: ['Score de risco automatizado', 'Histórico de sinistros', 'Análise de proprietários', 'Consultas recentes']
    },
    {
      id: 'workshop',
      path: '/workshop',
      title: 'Oficina',
      icon: Wrench,
      color: 'bg-orange-600',
      hoverColor: 'hover:bg-orange-700',
      description: 'Registro simples e eficiente de serviços realizados',
      features: ['Registro rápido de serviços', 'Histórico de manutenções', 'Upload de documentos', 'Busca por veículos']
    },
    {
      id: 'dmv',
      path: '/dmv',
      title: 'Detran / Órgão Oficial',
      icon: Building2,
      color: 'bg-red-600',
      hoverColor: 'hover:bg-red-700',
      description: 'Registro oficial de transferências de propriedade e boletins de ocorrência',
      features: ['Transferência de placa e dono', 'Registro de acidentes severos', 'Restrições e remarcações']
    }
  ];

  const stats = [
    {
      icon: BarChart,
      value: 'Sincronizado',
      label: 'Nó Blockchain Ativo',
      color: 'text-blue-600 bg-blue-50'
    },
    {
      icon: Users,
      value: 'Live',
      label: 'Rede Descentralizada',
      color: 'text-green-600 bg-green-50'
    },
    {
      icon: Clock,
      value: '24/7',
      label: 'Histórico Imutável',
      color: 'text-orange-600 bg-orange-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16 animate-fadeIn">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-100 rotate-3 transform hover:rotate-0 transition-all duration-500">
              <Car className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">
             Histórico Veicular <span className="text-indigo-600">On-Chain</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10 font-medium leading-relaxed">
            A primeira rede descentralizada do Brasil para auditoria completa e imutável de veículos. 
            Segurança total para montadoras, oficinas, seguradoras e compradores.
          </p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => navigate('/search')}
              className="px-10 py-5 bg-indigo-600 text-white font-black rounded-[24px] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all text-lg tracking-tight"
            >
              CONSULTAR VEÍCULO AGORA
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 animate-slideUp">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 border border-gray-100 hover:scale-105 transition-all">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${stat.color} mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-2xl font-black text-gray-900">{stat.value}</div>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.id} className="group bg-white rounded-[40px] shadow-2xl shadow-gray-200/60 overflow-hidden border border-gray-100 flex flex-col hover:border-indigo-100 transition-all duration-500">
                <div className="p-10 flex-grow">
                  <div className={`inline-flex items-center justify-center w-16 h-16 ${feature.color} rounded-x2l shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 mb-8`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-500 mb-8 font-medium leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-3 mb-8">
                    {feature.features.map((item, index) => (
                      <li key={index} className="flex items-center text-sm font-bold text-gray-400">
                        <div className={`w-1.5 h-1.5 ${feature.color} rounded-full mr-3`}></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="p-10 pt-0">
                  <button
                    onClick={() => navigate(feature.path)}
                    className={`w-full py-4 px-6 ${feature.color} ${feature.hoverColor} text-white font-black rounded-2xl shadow-xl transition-all duration-300 transform group-hover:shadow-2xl active:scale-95`}
                  >
                    ACESSAR PAINEL
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HomePage;