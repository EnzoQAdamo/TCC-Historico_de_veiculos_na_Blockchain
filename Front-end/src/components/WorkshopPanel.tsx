import React, { useState, useRef, useEffect } from 'react';
import { Wrench, Search, FileText, AlertTriangle, Loader2, Hash, ChevronDown, CheckCircle2, Gauge } from 'lucide-react';
import { VehicleHistory } from '../types';
import VehicleHistoryDetails from './VehicleHistoryDetails';
import { connectWallet, getRegistroVeicularContract } from '../config/blockchain';
import { getHistoricoCompleto } from '../services/db';
import { useToast } from '../context/ToastContext';

// Salto de quilometragem acima do qual pedimos confirmação extra ao usuário
const KM_JUMP_WARNING_THRESHOLD = 50000;

const TIPOS_SERVICO = [
  { value: 0, label: 'Preventiva' },
  { value: 1, label: 'Corretiva' },
  { value: 2, label: 'Sinistro / Funilaria' },
  { value: 3, label: 'Revisão de Fábrica' },
  { value: 4, label: 'Recall' },
  { value: 5, label: 'Outros' },
];

const WorkshopPanel: React.FC = () => {
  const { toast, blockUI, unblockUI } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleHistory, setVehicleHistory] = useState<VehicleHistory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [tipoDropdownOpen, setTipoDropdownOpen] = useState(false);
  const tipoDropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    chassis: '',
    description: '',
    mileage: '',
    tipo: 0,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tipoDropdownRef.current && !tipoDropdownRef.current.contains(e.target as Node))
        setTipoDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const novaKm = Number(formData.mileage);
    if (vehicleHistory && formData.chassis.toUpperCase() === vehicleHistory.chassis) {
      const ultimaKm = vehicleHistory.mileage;
      if (novaKm <= ultimaKm) {
        toast('error', `A quilometragem deve ser maior que a última registrada (${ultimaKm.toLocaleString('pt-BR')} km).`);
        return;
      }
      if (novaKm - ultimaKm > KM_JUMP_WARNING_THRESHOLD) {
        const confirmar = window.confirm(
          `Atenção: o salto de ${ultimaKm.toLocaleString('pt-BR')} km para ${novaKm.toLocaleString('pt-BR')} km (+${(novaKm - ultimaKm).toLocaleString('pt-BR')} km) é incomum. Confirma que está correto?`
        );
        if (!confirmar) return;
      }
    }

    setIsSubmitting(true);
    blockUI('Confirme a transação no MetaMask...');
    try {
      const signer = await connectWallet();
      const contract = await getRegistroVeicularContract(signer);
      const chassi = formData.chassis.toUpperCase();

      const existe = await contract.veiculoExiste(chassi);
      if (!existe) throw new Error('Chassi não registrado na Blockchain.');

      const tx = await contract.addManutencao(
        chassi,
        Math.floor(Date.now() / 1000),
        Number(formData.mileage),
        formData.description,
        formData.tipo,
      );
      blockUI('Aguardando confirmação na blockchain...', tx.hash);
      await tx.wait();

      toast('success', `Manutenção registrada! · Tx: ${tx.hash.slice(0, 10)}...`);
      setFormData({ chassis: '', description: '', mileage: '', tipo: 0 });
    } catch (err: any) {
      if (err.reason?.includes('quilometragem deve ser maior')) {
        toast('error', 'A quilometragem informada precisa ser maior que a última registrada para este veículo.');
      } else {
        toast('error', 'Falha: ' + (err.reason || err.message || 'Erro desconhecido'));
      }
    } finally {
      setIsSubmitting(false);
      unblockUI();
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      const history = await getHistoricoCompleto(searchTerm.toUpperCase());
      setVehicleHistory(history);
    } catch (err: any) {
      setVehicleHistory(null);
      toast('error', err.message || 'Veículo não encontrado.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Wrench className="w-10 h-10 text-orange-500" />
            Painel da Oficina
          </h1>
          <p className="text-gray-500 font-medium">Registro de manutenções com odômetro obrigatório.</p>
        </div>

        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
          <Search className="w-4 h-4 text-gray-400 ml-1" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar histórico por chassi..."
            className="outline-none text-sm font-medium text-gray-700 bg-transparent w-56 placeholder:text-gray-400"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-2 bg-orange-500 text-white text-xs font-black rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center gap-1"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Alerta de Recall */}
      {vehicleHistory?.recalls?.some(r => r.status === 'pending') && (
        <div className="mb-6 bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="bg-amber-500 p-3 rounded-xl shadow-lg flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-amber-800 font-black uppercase text-sm">Recall de Segurança Pendente</h3>
            <p className="text-amber-700 text-xs font-medium">Este veículo possui convocações de fábrica não atendidas. Notifique o proprietário.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Formulário */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 p-8">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              Registrar Manutenção
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Chassi
                </label>
                <input
                  type="text"
                  required
                  value={formData.chassis}
                  onChange={e => setFormData({ ...formData, chassis: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none font-mono text-sm transition-all"
                  placeholder="9BWZZZ..."
                />
              </div>

              <div ref={tipoDropdownRef}>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Tipo de Serviço</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTipoDropdownOpen(o => !o)}
                    className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none font-bold text-gray-700 transition-all flex justify-between items-center hover:bg-gray-100"
                  >
                    <span>{TIPOS_SERVICO[formData.tipo].label}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${tipoDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {tipoDropdownOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
                      {TIPOS_SERVICO.map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => { setFormData({ ...formData, tipo: t.value }); setTipoDropdownOpen(false); }}
                          className={`w-full px-5 py-3.5 text-left flex items-center justify-between text-sm font-bold transition-all hover:bg-orange-50 hover:text-orange-700 ${formData.tipo === t.value ? 'bg-orange-50 text-orange-700' : 'text-gray-700'}`}
                        >
                          {t.label}
                          {formData.tipo === t.value && <CheckCircle2 className="w-4 h-4 text-orange-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Gauge className="w-3 h-3" /> Quilometragem Atual
                </label>
                {vehicleHistory && formData.chassis.toUpperCase() === vehicleHistory.chassis && (
                  <p className="text-[10px] font-black text-orange-500 uppercase mb-2">
                    Última registrada: {vehicleHistory.mileage.toLocaleString('pt-BR')} km
                  </p>
                )}
                <input
                  type="number"
                  required
                  min={
                    vehicleHistory && formData.chassis.toUpperCase() === vehicleHistory.chassis
                      ? vehicleHistory.mileage + 1
                      : 1
                  }
                  value={formData.mileage}
                  onChange={e => setFormData({ ...formData, mileage: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none font-bold text-gray-700 transition-all"
                  placeholder="Ex: 45000"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Descrição do Serviço</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none font-medium transition-all resize-none"
                  placeholder="Descreva o serviço realizado..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                {isSubmitting ? 'Registrando...' : 'REGISTRAR MANUTENÇÃO'}
              </button>
            </form>
          </div>
        </div>

        {/* Histórico */}
        <div className="lg:col-span-2">
          {vehicleHistory ? (
            <VehicleHistoryDetails vehicleHistory={vehicleHistory} />
          ) : (
            <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 flex flex-col items-center justify-center py-24 text-center">
              <Search className="w-12 h-12 text-gray-200 mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Busque um chassi para ver o histórico</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkshopPanel;
