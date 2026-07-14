import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Download, AlertTriangle, ShieldCheck } from 'lucide-react';
import { generatePDF } from '../utils/pdfGenerator';
import { Vehicle, VehicleHistory } from '../types';
import VehicleHistoryDetails from './VehicleHistoryDetails';
import { getHistoricoCompleto, buscarPorPlaca } from '../services/db';
import { useToast } from '../context/ToastContext';

const PublicSearch: React.FC = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Vehicle | null>(null);
  const [vehicleHistory, setVehicleHistory] = useState<VehicleHistory | null>(null);
  const [isGeneratingPDF] = useState(false);

  // Efeito para busca automática via Deep Link
  useEffect(() => {
    const chassisParam = searchParams.get('chassis');
    if (chassisParam && !isSearching && !searchResult) {
      setSearchQuery(chassisParam);
      // Dispara a busca após um pequeno delay para garantir que o provider esteja pronto
      const timer = setTimeout(() => {
        handleSearch(chassisParam);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const getScoreInfo = (score: number) => {
    if (score >= 80) return { label: 'Excelente', color: 'text-green-600', bg: 'bg-green-50', bar: 'bg-green-500' };
    if (score >= 50) return { label: 'Regular', color: 'text-yellow-600', bg: 'bg-yellow-50', bar: 'bg-yellow-500' };
    return { label: 'Crítico', color: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500' };
  };

  const handleSearch = async (forcedChassis?: string) => {
    let query = (forcedChassis || searchQuery).trim().toUpperCase();
    if (!query) return;

    setIsSearching(true);
    try {
      if (!forcedChassis) setSearchParams({ chassis: query });

      // Suporte a busca por placa além de chassi
      if (query.length <= 8 && !query.startsWith('9B')) {
        const chassiPorPlaca = await buscarPorPlaca(query);
        if (chassiPorPlaca) query = chassiPorPlaca.toUpperCase();
      }

      const history = await getHistoricoCompleto(query);
      setSearchResult({
        id: history.chassis,
        brand: history.brand,
        model: history.model,
        modelYear: history.modelYear,
        manufacturingYear: history.manufacturingYear,
        chassisPrefix: history.chassisPrefix,
        color: history.color,
        city: history.city,
        state: history.state,
        fipePrice: 0,
        price: 0,
        mileage: history.mileage,
        plate: history.plate,
        chassis: history.chassis,
        status: 'verified',
        owners: history.owners,
      });
      setVehicleHistory(history);
    } catch (error: any) {
      setSearchResult(null);
      setVehicleHistory(null);
      toast('error', error.message || 'Veículo não encontrado.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12 animate-fadeIn">
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">
          Consulta <span className="text-indigo-600">Pública</span> Universal
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto font-medium">
          Acesse o histórico imutável e a nota de confiança de qualquer veículo na rede.
          Transparência gerada por criptografia.
        </p>
      </div>

      <div className="max-w-3xl mx-auto mb-12">
        <div className="bg-white rounded-[32px] shadow-2xl shadow-gray-200/50 p-3 border border-gray-100 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Digite o CHASSI para consultar..."
            className="flex-1 px-6 py-4 bg-transparent border-none focus:ring-0 font-bold text-gray-700 text-lg placeholder:text-gray-300"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={() => handleSearch()}
            disabled={isSearching}
            className="px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            {isSearching ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Search className="h-5 w-5" />}
            {isSearching ? 'BUSCANDO...' : 'BUSCAR'}
          </button>
        </div>
      </div>

      {searchResult && (
        <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden mb-12 animate-slideUp">
          <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-wider rounded-full">Registro Blockchain</span>
                {vehicleHistory?.isHighMileage && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-full border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Uso Intenso
                  </span>
                )}
              </div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                {searchResult.brand} {searchResult.model}
              </h2>
              <div className="flex flex-wrap gap-4 mt-2 font-bold text-gray-400 text-sm">
                <span>Ano: {searchResult.modelYear}</span>
                <span>Placa: {searchResult.plate}</span>
                <span className="font-mono">{searchResult.chassis}</span>
              </div>
            </div>

            <button
              onClick={() => generatePDF(vehicleHistory || searchResult as any, 'public')}
              className="px-6 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center gap-2"
            >
              <Download className="h-5 w-5" /> BAIXAR RELATÓRIO
            </button>
          </div>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Score Section for Public UI */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center p-8 bg-gray-50 rounded-[32px] border border-gray-100">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Confiança Veicular Auditada</div>
              <div className={`text-7xl font-black ${getScoreInfo(vehicleHistory?.riskScore || 0).color}`}>
                {vehicleHistory?.riskScore}
              </div>
              <div className={`mt-2 px-4 py-1 rounded-full text-[10px] font-black uppercase ${getScoreInfo(vehicleHistory?.riskScore || 0).bg} ${getScoreInfo(vehicleHistory?.riskScore || 0).color}`}>
                Status: {getScoreInfo(vehicleHistory?.riskScore || 0).label}
              </div>
            </div>

            {/* Risk Factors Section for Public UI */}
            <div className="lg:col-span-8 flex flex-col justify-center">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Apontamentos Auditados</h4>
              <div className="flex flex-wrap gap-3">
                {vehicleHistory && vehicleHistory.riskFactors.length > 0 ? (
                  vehicleHistory.riskFactors.map((factor, i) => (
                    <div key={i} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-100 rounded-xl font-bold text-sm">
                      <AlertTriangle className="w-4 h-4" /> {factor}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-100 rounded-xl font-bold text-sm">
                    <ShieldCheck className="w-4 h-4" /> Veículo Sem Apontamentos Críticos
                  </div>
                )}
                {vehicleHistory?.isHighMileage && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl font-bold text-sm italic">
                    <AlertTriangle className="w-4 h-4" /> Uso Diário Intenso (Acima da Média)
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-50 pt-8 p-8">
            {vehicleHistory && <VehicleHistoryDetails vehicleHistory={vehicleHistory} />}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicSearch;
