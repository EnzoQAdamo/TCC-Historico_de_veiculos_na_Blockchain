import React, { useState } from 'react';
import { Search, BarChart3, Users, AlertTriangle, Wrench, Calendar, ShieldCheck, Loader2, CheckCircle2, Download } from 'lucide-react';
import { VehicleHistory } from '../types';
import VehicleHistoryDetails from './VehicleHistoryDetails';
import { getHistoricoCompleto } from '../services/db';
import { generatePDF } from '../utils/pdfGenerator';
import { useToast } from '../context/ToastContext';

const InsurancePanel: React.FC = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<VehicleHistory | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const history = await getHistoricoCompleto(searchQuery.toUpperCase());
      setSearchResult(history);
    } catch (error: any) {
      setSearchResult(null);
      toast('error', error.message || 'Chassi não encontrado.');
    } finally {
      setIsSearching(false);
    }
  };

  const getScoreInfo = (score: number) => {
    if (score >= 80) return { label: 'Excelente', color: 'text-green-600', bg: 'bg-green-50', bar: 'bg-green-500' };
    if (score >= 50) return { label: 'Regular', color: 'text-yellow-600', bg: 'bg-yellow-50', bar: 'bg-yellow-500' };
    return { label: 'Crítico', color: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500' };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-10 h-10 text-indigo-600" />
          Painel da Seguradora
        </h1>
        <p className="text-gray-500 font-medium">Análise de risco avançada com score de confiabilidade auditado.</p>
      </div>

      <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 p-8 mb-10">
        <h2 className="text-xl font-black text-gray-900 mb-4">Análise On-Chain por Chassi</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o número do chassi para análise completa..."
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <BarChart3 className="w-5 h-5" />}
            {isSearching ? 'ANALISANDO...' : 'INICIAR ANÁLISE'}
          </button>
        </div>
      </div>

      {searchResult && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    {searchResult.brand} {searchResult.model}
                  </h3>
                  {searchResult.isHighMileage && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-full border border-amber-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Uso Intenso
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {searchResult.plate}</span>
                  <span className="flex items-center gap-1 font-mono">{searchResult.chassis}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => generatePDF(searchResult, 'insurance')}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all"
                >
                  <Download className="w-4 h-4" /> EXPORTAR PDF
                </button>
                <div className="flex items-center gap-2 text-sm font-black text-gray-400 bg-gray-50 px-4 py-2 rounded-full uppercase tracking-widest">
                  <Calendar className="h-4 w-4" /> {new Date(searchResult.lastUpdate).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-10 bg-gray-50 rounded-[40px] border border-gray-100 relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Score de Procedência Registro Veicular</div>
                  <div className={`text-8xl font-black tracking-tighter ${getScoreInfo(searchResult.riskScore).color}`}>
                    {searchResult.riskScore}
                  </div>
                  <div className={`mt-2 px-6 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${getScoreInfo(searchResult.riskScore).bg} ${getScoreInfo(searchResult.riskScore).color}`}>
                    Nível {getScoreInfo(searchResult.riskScore).label}
                  </div>
                </div>
                <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-10 ${getScoreInfo(searchResult.riskScore).bar}`}></div>
              </div>

              <div className="lg:col-span-7 space-y-6">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.15em]">Motivos da Nota</h4>
                <div className="space-y-3">
                  {searchResult.riskFactors.length > 0 ? (
                    searchResult.riskFactors.map((factor, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 bg-white border border-red-50 rounded-2xl shadow-sm">
                        <div className="p-2 bg-red-50 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <span className="font-bold text-gray-700">{factor}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-4 p-6 bg-green-50/50 border border-green-100 rounded-[24px]">
                      <div className="p-3 bg-green-100 rounded-full">
                        <ShieldCheck className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <div className="font-black text-green-700 leading-tight">Histórico Impecável</div>
                        <div className="text-xs font-medium text-green-600/80">Nenhuma irregularidade auditada na blockchain.</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="text-[9px] font-black text-gray-400 uppercase mb-1">Donos</div>
                    <div className="text-xl font-black text-gray-900">{searchResult.owners}</div>
                  </div>
                  <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="text-[9px] font-black text-gray-400 uppercase mb-1">Sinistros</div>
                    <div className="text-xl font-black text-red-500">{searchResult.officialReports.length}</div>
                  </div>
                  <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="text-[9px] font-black text-gray-400 uppercase mb-1">Serviços</div>
                    <div className="text-xl font-black text-green-600">{searchResult.maintenanceRecords.length}</div>
                  </div>
                  <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="text-[9px] font-black text-gray-400 uppercase mb-1">Km Total</div>
                    <div className="text-xl font-black text-gray-900">{Math.floor(searchResult.mileage).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <VehicleHistoryDetails vehicleHistory={searchResult} />
        </div>
      )}
    </div>
  );
};

export default InsurancePanel;