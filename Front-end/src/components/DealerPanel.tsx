import React, { useState } from 'react';
import { Search, Download, ExternalLink, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { dealerInventory, vehicleHistories } from '../data/mockData';
import { generatePDF, formatCurrency } from '../utils/pdfGenerator';
import { Vehicle, VehicleHistory } from '../types';
import VehicleHistoryDetails from './VehicleHistoryDetails';

const DealerPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Vehicle | null>(null);
  const [vehicleHistory, setVehicleHistory] = useState<VehicleHistory | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Simula busca
    setTimeout(() => {
      const query = searchQuery.toLowerCase();
      const found = dealerInventory.find(v => 
        v.chassis.toLowerCase().includes(query) ||
        v.plate.toLowerCase().includes(query)
      );
      setSearchResult(found || null);
      
      // Busca histórico detalhado
      if (found) {
        const history = vehicleHistories.find(h => 
          h.chassis === found.chassis || h.plate === found.plate
        );
        setVehicleHistory(history || null);
      } else {
        setVehicleHistory(null);
      }
      
      setIsSearching(false);
    }, 1000);
  };

  const handleGeneratePDF = async (vehicle: Vehicle) => {
    setIsGeneratingPDF(true);
    try {
      await generatePDF(vehicle, 'dealer');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Histórico Verificado';
      case 'pending':
        return 'Verificação Pendente';
      default:
        return 'Problema Identificado';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Painel do Vendedor
        </h1>
        <p className="text-gray-600">
          Geração rápida de relatórios e gestão do inventário
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Buscar Veículo por Placa ou Chassi
        </h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite a placa (ABC1234) ou número do chassi..."
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
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* Search Result */}
        {searchResult && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {searchResult.brand} {searchResult.model}
                </h3>
                <p className="text-gray-600">Ano: {searchResult.year}</p>
                <p className="text-gray-600">Placa: {searchResult.plate}</p>
                <p className="text-gray-600 font-mono text-sm">Chassi: {searchResult.chassis}</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(searchResult.status)}
                <span className="text-sm font-medium">
                  {getStatusText(searchResult.status)}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleGeneratePDF(searchResult)}
                disabled={isGeneratingPDF}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {isGeneratingPDF ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Gerar Relatório PDF
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors">
                <ExternalLink className="h-4 w-4" />
                Integrar Anúncio
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Vehicle History Details */}
      {vehicleHistory && (
        <div className="mb-8">
          <VehicleHistoryDetails vehicleHistory={vehicleHistory} />
        </div>
      )}

      {/* Inventory Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Inventário da Concessionária
          </h2>
          <span className="text-sm text-gray-600">
            {dealerInventory.length} veículos em estoque
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dealerInventory.map((vehicle) => (
            <div key={vehicle.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {vehicle.brand} {vehicle.model}
                  </h3>
                  <p className="text-sm text-gray-600">Ano: {vehicle.year}</p>
                </div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(vehicle.status)}
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  Km: {vehicle.mileage.toLocaleString('pt-BR')}
                </p>
                <p className="text-sm text-gray-600">
                  Proprietários: {vehicle.owners}
                </p>
                <p className="text-sm text-gray-600 font-mono">
                  Placa: {vehicle.plate}
                </p>
                {vehicle.price && (
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(vehicle.price)}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleGeneratePDF(vehicle)}
                  className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Relatório
                </button>
                <button className="flex-1 px-3 py-2 text-sm bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors">
                  Anunciar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DealerPanel;