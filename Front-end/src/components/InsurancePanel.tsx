import React, { useState } from 'react';
import { Search, BarChart3, Users, AlertTriangle, Wrench, Calendar } from 'lucide-react';
import { vehicleHistories, recentSearches } from '../data/mockData';
import { VehicleHistory } from '../types';
import VehicleHistoryDetails from './VehicleHistoryDetails';

const InsurancePanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<VehicleHistory | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Simula busca
    setTimeout(() => {
      const query = searchQuery.toLowerCase();
      const found = vehicleHistories.find(v => 
        v.chassis.toLowerCase().includes(query) ||
        v.plate.toLowerCase().includes(query)
      );
      setSearchResult(found || null);
      setIsSearching(false);
    }, 1500);
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return 'Baixo Risco';
    if (score >= 60) return 'Risco Moderado';
    return 'Alto Risco';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Painel da Seguradora
        </h1>
        <p className="text-gray-600">
          Análise de risco e histórico completo de veículos
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Consultar Histórico por Placa ou Chassi
        </h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite a placa (ABC1234) ou número do chassi para análise completa..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isSearching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isSearching ? 'Analisando...' : 'Analisar'}
          </button>
        </div>
      </div>

      {/* Search Result */}
      {searchResult && (
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchResult.brand} {searchResult.model}
              </h3>
              <p className="text-gray-600">Placa: {searchResult.plate}</p>
              <p className="text-gray-600 font-mono text-sm">Chassi: {searchResult.chassis}</p>
            </div>

            {/* Risk Score */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-medium text-gray-900">Score de Risco</h4>
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${getRiskScoreColor(searchResult.riskScore)}`}>
                  {searchResult.riskScore}/100 - {getRiskLevel(searchResult.riskScore)}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${
                    searchResult.riskScore >= 80 ? 'bg-green-600' :
                    searchResult.riskScore >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${searchResult.riskScore}%` }}
                ></div>
              </div>
            </div>

            {/* Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Proprietários</p>
                    <p className="text-2xl font-bold text-blue-900">{searchResult.owners}</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-sm text-red-600 font-medium">Relatórios</p>
                    <p className="text-2xl font-bold text-red-900">{searchResult.officialReports.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Wrench className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-green-600 font-medium">Manutenções</p>
                    <p className="text-2xl font-bold text-green-900">{searchResult.maintenanceRecords.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Quilometragem</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {searchResult.mileage.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              Última atualização: {new Date(searchResult.lastUpdate).toLocaleDateString('pt-BR')}
            </div>
          </div>
          
          {/* Detailed History */}
          <VehicleHistoryDetails vehicleHistory={searchResult} />
        </div>
      )}

      {/* Recent Searches */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Consultas Recentes
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chassi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentSearches.slice(0, 5).map((search, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {search.query}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(search.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      search.type === 'insurance' ? 'bg-blue-100 text-blue-800' :
                      search.type === 'dealer' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {search.type === 'insurance' ? 'Seguradora' :
                       search.type === 'dealer' ? 'Concessionária' : 'Oficina'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <button 
                      onClick={() => {
                        setSearchQuery(search.query);
                        handleSearch();
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Consultar novamente
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InsurancePanel;