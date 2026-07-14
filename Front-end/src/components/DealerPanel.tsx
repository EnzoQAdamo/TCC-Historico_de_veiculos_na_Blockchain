import React, { useState } from 'react';
import { Search, BarChart3, Users, AlertTriangle, Wrench, Calendar, ShieldCheck, Loader2, CheckCircle2, Download } from 'lucide-react';
import { VehicleHistory } from '../types';
import VehicleHistoryDetails from './VehicleHistoryDetails';
import { getHistoricoCompleto } from '../services/db';
import { generatePDF } from '../utils/pdfGenerator';
import { useToast } from '../context/ToastContext';

const DealerPanel: React.FC = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [vehicleHistory, setVehicleHistory] = useState<VehicleHistory | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const history = await getHistoricoCompleto(searchQuery.toUpperCase());
      setVehicleHistory(history);
    } catch (error: any) {
      setVehicleHistory(null);
      toast('error', error.message || 'Veículo não encontrado.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Painel do Vendedor</h1>
          <p className="text-gray-500 font-medium">Relatórios rápidos e certificados para estoque.</p>
        </div>
        {vehicleHistory && (
          <button
            onClick={() => {
              setIsGeneratingPDF(true);
              generatePDF(vehicleHistory, 'dealer').finally(() => setIsGeneratingPDF(false));
            }}
            disabled={isGeneratingPDF}
            className="px-8 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 transition-all shadow-lg flex items-center gap-2"
          >
            {isGeneratingPDF ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            CERTIFICADO EM PDF
          </button>
        )}
      </div>

      <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 p-8 mb-10">
        <h2 className="text-xl font-black text-gray-900 mb-4">Gerar Laudo por Chassi</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Digite o chassi..."
            className="flex-1 px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none font-bold transition-all"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-10 py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            CONSULTAR
          </button>
        </div>
      </div>

      {vehicleHistory && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black">{vehicleHistory.brand} {vehicleHistory.model}</h2>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full font-black text-xs uppercase">
                <ShieldCheck className="w-4 h-4" /> Procedência Auditada
              </div>
            </div>
            <VehicleHistoryDetails vehicleHistory={vehicleHistory} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DealerPanel;