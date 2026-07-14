import React, { useState, useEffect, useRef } from 'react';
import { Factory, PlusCircle, Car, Search, ClipboardList, Loader2, AlertTriangle, CheckCircle, CheckCircle2, ChevronDown, ShieldCheck, ShieldAlert, X } from 'lucide-react';
import { validateVIN } from '../utils/vinValidator';
import { connectWallet, getRegistroVeicularContract } from '../config/blockchain';
import { supabase, supabaseConfigured } from '../config/supabase';
import { useToast } from '../context/ToastContext';
import { getHistoricoCompleto } from '../services/db';
import { VehicleHistory } from '../types';
import VehicleHistoryDetails from './VehicleHistoryDetails';

interface ModelInfo {
  id: number;
  modelo: string;
  ano: number;
  estilo: number;
  assinatura_marca: string;
}

interface VehicleInfo {
  chassi: string;
  modeloNome: string;
  cor: string;
  dataFabricacao: string;
  timestamp: number;
}

interface RecallInfo {
  chassi: string;
  recallId: string;
  descricao: string;
  resolvido: boolean;
  data: string;
  timestamp: number;
}

const VEHICLE_STYLES = [
  'Desconhecido', 'Sedan', 'SUV', 'Hatchback', 'Picape', 'Coupe', 'Van', 'Motocicleta',
];

const VINFeedback: React.FC<{ vin: string; expectedWmi?: string }> = ({ vin, expectedWmi }) => {
  if (vin.length === 0) return null;
  const result = validateVIN(vin);
  if (vin.length < 17) {
    return <p className="text-[10px] font-bold text-gray-400 mt-1.5">{vin.length}/17 caracteres</p>;
  }
  if (result.errors.length > 0) {
    return (
      <div className="mt-2 p-3 bg-red-50 rounded-xl border border-red-100">
        {result.errors.map((e, i) => <p key={i} className="text-[10px] font-bold text-red-600 flex items-center gap-1"><ShieldAlert className="w-3 h-3 flex-shrink-0" />{e}</p>)}
      </div>
    );
  }

  const wmi = vin.slice(0, 3);
  if (expectedWmi && wmi !== expectedWmi) {
    return (
      <div className="mt-2 p-3 bg-red-50 rounded-xl border border-red-100">
        <p className="text-[10px] font-bold text-red-600 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 flex-shrink-0" />
          O prefixo WMI deste chassi ("{wmi}") não corresponde ao WMI cadastrado para sua montadora ("{expectedWmi}"). A blockchain vai recusar este registro — confira se digitou o chassi corretamente.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-green-50 rounded-xl border border-green-100 space-y-0.5">
      <p className="text-[10px] font-black text-green-700 flex items-center gap-1"><ShieldCheck className="w-3 h-3" />VIN válido</p>
      {result.info?.manufacturer && <p className="text-[10px] font-bold text-green-600">Fabricante: {result.info.manufacturer}</p>}
      {result.info?.modelYear && <p className="text-[10px] font-bold text-green-600">Ano modelo: {result.info.modelYear}</p>}
      {result.warnings.map((w, i) => <p key={i} className="text-[10px] font-bold text-amber-600">⚠ {w}</p>)}
    </div>
  );
};

const ManufacturerPanel: React.FC = () => {
  const { toast, blockUI, unblockUI } = useToast();
  const [activeTab, setActiveTab] = useState<'modelo' | 'veiculo' | 'inventario' | 'recall'>('modelo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [inventory, setInventory] = useState<VehicleInfo[]>([]);
  const [recalls, setRecalls] = useState<RecallInfo[]>([]);
  const [montadoraWmi, setMontadoraWmi] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleHistory | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [modeloSearchTerm, setModeloSearchTerm] = useState('');
  const [confirmingRecall, setConfirmingRecall] = useState<RecallInfo | null>(null);

  // Dropdown states
  const [estiloDropdownOpen, setEstiloDropdownOpen] = useState(false);
  const [modeloDropdownOpen, setModeloDropdownOpen] = useState(false);
  const [chassiDropdownOpen, setChassiDropdownOpen] = useState(false);
  const estiloDropdownRef = useRef<HTMLDivElement>(null);
  const modeloDropdownRef = useRef<HTMLDivElement>(null);
  const chassiDropdownRef = useRef<HTMLDivElement>(null);

  // Formulário Modelo
  const [modeloData, setModeloData] = useState({ nome: '', ano: new Date().getFullYear().toString(), estilo: '1' });

  // Formulário Veículo
  const [veiculoData, setVeiculoData] = useState({ chassi: '', idModelo: '', cor: '' });

  // Formulário Recall
  const [recallData, setRecallData] = useState({ chassi: '', recallId: '', descricao: '', resolvido: false });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (estiloDropdownRef.current && !estiloDropdownRef.current.contains(e.target as Node))
        setEstiloDropdownOpen(false);
      if (modeloDropdownRef.current && !modeloDropdownRef.current.contains(e.target as Node))
        setModeloDropdownOpen(false);
      if (chassiDropdownRef.current && !chassiDropdownRef.current.contains(e.target as Node))
        setChassiDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { loadManufacturerData(); }, [activeTab]);

  const loadManufacturerData = async () => {
    if (!supabaseConfigured) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const signer = await connectWallet();
      const userAddress = (await signer.getAddress()).toLowerCase();

      const contract = await getRegistroVeicularContract(signer);
      const ator = await contract.atores(userAddress);
      setMontadoraWmi(ator.wmi);

      const { data: modelosData } = await supabase
        .from('modelos').select('*').eq('montadora', userAddress).order('id_modelo');

      const allModels: ModelInfo[] = (modelosData ?? []).map((m: any) => ({
        id: m.id_modelo, modelo: m.nome, ano: m.ano, estilo: m.estilo, assinatura_marca: m.montadora,
      }));
      setModels(allModels);

      if (activeTab === 'inventario' || activeTab === 'recall' || activeTab === 'veiculo') {
        const { data: veiculosData } = await supabase
          .from('veiculos').select('*, modelos(nome)').eq('montadora', userAddress).order('created_at', { ascending: false });

        setInventory((veiculosData ?? []).map((v: any) => ({
          chassi: v.chassi,
          modeloNome: v.modelos?.nome ?? `Modelo #${v.id_modelo}`,
          cor: v.cor_fabrica,
          timestamp: new Date(v.data_fabricacao).getTime() / 1000,
          dataFabricacao: new Date(v.data_fabricacao).toLocaleDateString('pt-BR'),
        })));

        if (activeTab === 'recall') {
          const { data: recallsData } = await supabase
            .from('historico_recalls').select('*').eq('assinatura_montadora', userAddress).order('data', { ascending: false });

          const consolidated = new Map<string, RecallInfo>();
          (recallsData ?? []).forEach((r: any) => {
            const key = `${r.chassi}-${r.recall_id}`;
            if (!consolidated.has(key)) {
              consolidated.set(key, {
                chassi: r.chassi, recallId: r.recall_id, descricao: r.descricao, resolvido: r.resolvido,
                data: new Date(r.data).toLocaleDateString('pt-BR'), timestamp: new Date(r.data).getTime() / 1000,
              });
            }
          });
          setRecalls(Array.from(consolidated.values()));
        }
      }
    } catch {
      toast('error', 'Erro ao carregar dados da montadora.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddModelo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    blockUI('Confirme a transação no MetaMask...');
    try {
      const signer = await connectWallet();
      const contract = await getRegistroVeicularContract(signer);
      const tx = await contract.addModelo(modeloData.nome, Number(modeloData.ano), Number(modeloData.estilo));
      blockUI('Aguardando confirmação na blockchain...', tx.hash);
      await tx.wait();
      toast('success', `Modelo registrado! · Tx: ${tx.hash.slice(0, 10)}...`);
      setModeloData({ ...modeloData, nome: '' });
      loadManufacturerData();
    } catch (err: any) {
      toast('error', 'Erro: ' + (err.reason || err.message));
    } finally {
      setIsSubmitting(false);
      unblockUI();
    }
  };

  const handleAddVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!veiculoData.idModelo) { toast('warning', 'Selecione um modelo antes de continuar.'); return; }
    setIsSubmitting(true);
    blockUI('Confirme a transação no MetaMask...');
    try {
      const signer = await connectWallet();
      const contract = await getRegistroVeicularContract(signer);
      const tx = await contract.addVeiculo(veiculoData.chassi.toUpperCase(), Number(veiculoData.idModelo), Math.floor(Date.now() / 1000), veiculoData.cor);
      blockUI('Aguardando confirmação na blockchain...', tx.hash);
      await tx.wait();
      toast('success', `Veículo registrado! · Tx: ${tx.hash.slice(0, 10)}...`);
      setVeiculoData({ chassi: '', idModelo: '', cor: '' });
      loadManufacturerData();
    } catch (err: any) {
      if (err.reason?.includes('WMI do chassi nao corresponde')) {
        toast('error', `Erro: o prefixo (WMI) deste chassi não corresponde ao WMI cadastrado para sua montadora${montadoraWmi ? ` ("${montadoraWmi}")` : ''}. Confira os 3 primeiros caracteres do chassi.`);
      } else {
        toast('error', 'Erro: ' + (err.reason || err.message));
      }
    } finally {
      setIsSubmitting(false);
      unblockUI();
    }
  };

  const handleAddRecall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recallData.chassi) { toast('warning', 'Selecione um chassi do inventário.'); return; }
    setIsSubmitting(true);
    blockUI('Confirme a transação no MetaMask...');
    try {
      const signer = await connectWallet();
      const contract = await getRegistroVeicularContract(signer);
      const tx = await contract.addRegistroRecall(recallData.chassi, Math.floor(Date.now() / 1000), recallData.recallId, recallData.descricao, recallData.resolvido);
      blockUI('Aguardando confirmação na blockchain...', tx.hash);
      await tx.wait();
      toast('warning', `Recall publicado na blockchain! · Tx: ${tx.hash.slice(0, 10)}...`);
      setRecallData({ chassi: '', recallId: '', descricao: '', resolvido: false });
      setChassiDropdownOpen(false);
      loadManufacturerData();
    } catch (err: any) {
      toast('error', 'Erro: ' + (err.reason || err.message));
    } finally {
      setIsSubmitting(false);
      unblockUI();
    }
  };

  const handleResolveRecall = async (recall: RecallInfo) => {
    setIsSubmitting(true);
    blockUI('Confirme a transação no MetaMask...');
    try {
      const signer = await connectWallet();
      const contract = await getRegistroVeicularContract(signer);
      const tx = await contract.addRegistroRecall(recall.chassi, Math.floor(Date.now() / 1000), recall.recallId, `${recall.descricao} (RESOLVIDO EM REVISÃO)`, true);
      blockUI('Aguardando confirmação na blockchain...', tx.hash);
      await tx.wait();
      toast('success', `Recall ${recall.recallId} resolvido! · Tx: ${tx.hash.slice(0, 10)}...`);
      setConfirmingRecall(null);
      loadManufacturerData();
    } catch (err: any) {
      toast('error', 'Erro: ' + (err.reason || err.message));
    } finally {
      setIsSubmitting(false);
      unblockUI();
    }
  };

  const handleViewDetails = async (chassi: string) => {
    setLoadingDetails(true);
    try {
      const history = await getHistoricoCompleto(chassi);
      setSelectedVehicle(history);
    } catch (err: any) {
      toast('error', err.message || 'Não foi possível carregar os detalhes do veículo.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredInventory = inventory.filter(v => (v.chassi || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredRecalls = recalls.filter(r =>
    (r.chassi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.recallId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredInventoryForChassi = inventory.filter(v =>
    v.chassi.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
    v.modeloNome.toLowerCase().includes(vehicleSearchTerm.toLowerCase())
  );
  const filteredModelsForDropdown = models.filter(m =>
    m.modelo.toLowerCase().includes(modeloSearchTerm.toLowerCase())
  );

  const selectedModel = models.find(m => String(m.id) === veiculoData.idModelo);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight uppercase">Painel da Montadora</h1>
          <p className="text-gray-500 font-medium">Gestão global de modelos, linha de produção e segurança veicular.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8 bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
        {[
          { id: 'modelo', icon: PlusCircle, label: 'Modelos' },
          { id: 'veiculo', icon: Car, label: 'Produção' },
          { id: 'recall', icon: AlertTriangle, label: 'Gestão de Recalls' },
          { id: 'inventario', icon: ClipboardList, label: 'Inventário' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`flex-1 py-5 px-6 font-bold text-xs flex items-center justify-center gap-2 transition-all uppercase tracking-widest ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            <tab.icon className="w-5 h-5" /> {tab.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col justify-center items-center py-20 animate-pulse">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sincronizando com a Blockchain...</p>
        </div>
      )}

      {!isLoading && (
        <div className="animate-fadeIn">

          {/* ─── ABA MODELO ─── */}
          {activeTab === 'modelo' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-[32px] shadow-2xl p-8 border border-gray-100">
                <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                  <PlusCircle className="text-blue-600" /> NOVO PROJETO DE MODELO
                </h2>
                <form onSubmit={handleAddModelo} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Nome do Modelo</label>
                    <input
                      type="text" required value={modeloData.nome}
                      onChange={e => setModeloData({ ...modeloData, nome: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 transition-all"
                      placeholder="Ex: Corolla XEi"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Ano Comercial</label>
                      <input
                        type="number" required value={modeloData.ano}
                        onChange={e => setModeloData({ ...modeloData, ano: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 transition-all"
                      />
                    </div>
                    <div ref={estiloDropdownRef}>
                      <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Estilo</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setEstiloDropdownOpen(o => !o)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-left flex justify-between items-center hover:bg-gray-100 transition-all"
                        >
                          <span>{VEHICLE_STYLES[Number(modeloData.estilo)]}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${estiloDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {estiloDropdownOpen && (
                          <div className="absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
                            {VEHICLE_STYLES.map((style, idx) => (
                              <button
                                key={idx} type="button"
                                onClick={() => { setModeloData({ ...modeloData, estilo: String(idx) }); setEstiloDropdownOpen(false); }}
                                className={`w-full px-5 py-3.5 text-left flex items-center justify-between text-sm font-bold transition-all hover:bg-blue-50 hover:text-blue-700 ${Number(modeloData.estilo) === idx ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                              >
                                {style}
                                {Number(modeloData.estilo) === idx && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-100 uppercase tracking-widest text-xs disabled:opacity-50 transition-all">
                    {isSubmitting ? 'PROCESSANDO...' : 'REGISTRAR MODELO'}
                  </button>
                </form>
              </div>
              <div className="bg-blue-50/50 rounded-[32px] p-8 border-2 border-dashed border-blue-100 flex flex-col justify-center">
                <h3 className="text-lg font-black text-blue-900 mb-4 uppercase">Diretrizes de Ativos</h3>
                <p className="text-blue-700/70 font-medium mb-4 italic text-sm">O modelo cadastrado aqui serve como "planta" para todos os veículos (VINs) que sua montadora irá emitir no futuro.</p>
              </div>
            </div>
          )}

          {/* ─── ABA VEÍCULO ─── */}
          {activeTab === 'veiculo' && (
            <div className="max-w-2xl mx-auto bg-white rounded-[32px] shadow-2xl p-8 border border-gray-100">
              <h2 className="text-xl font-black text-gray-800 mb-6 uppercase tracking-tight">Emitir Novo Chassi (Fabricação)</h2>
              <form onSubmit={handleAddVeiculo} className="space-y-6">

                {/* Dropdown de Modelo com busca */}
                <div ref={modeloDropdownRef}>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Vincular a Modelo Ativo</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setModeloDropdownOpen(o => !o)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-left flex justify-between items-center hover:bg-gray-100 transition-all"
                    >
                      <span className={selectedModel ? 'text-gray-700' : 'text-gray-400 font-medium'}>
                        {selectedModel ? `${selectedModel.modelo} (${selectedModel.ano})` : 'Selecione um projeto...'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${modeloDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {modeloDropdownOpen && (
                      <div className="absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
                        <div className="p-3 bg-gray-50 border-b border-gray-100">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              autoFocus type="text" placeholder="Buscar modelo..."
                              value={modeloSearchTerm}
                              onChange={e => setModeloSearchTerm(e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                            />
                          </div>
                        </div>
                        <div className="max-h-[240px] overflow-y-auto">
                          {filteredModelsForDropdown.length > 0 ? (
                            filteredModelsForDropdown.map(m => (
                              <button
                                key={m.id} type="button"
                                onClick={() => { setVeiculoData({ ...veiculoData, idModelo: String(m.id) }); setModeloDropdownOpen(false); setModeloSearchTerm(''); }}
                                className={`w-full px-5 py-3.5 text-left flex items-center justify-between text-sm font-bold transition-all hover:bg-blue-50 hover:text-blue-700 ${veiculoData.idModelo === String(m.id) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                              >
                                <span>{m.modelo} <span className="font-normal text-gray-400">({m.ano})</span></span>
                                {veiculoData.idModelo === String(m.id) && <CheckCircle className="w-4 h-4 text-blue-500" />}
                              </button>
                            ))
                          ) : (
                            <div className="px-5 py-10 text-center">
                              <p className="text-[10px] font-black text-gray-300 uppercase italic">Nenhum modelo encontrado</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Número do VIN (Chassi)</label>
                  {montadoraWmi && (
                    <p className="text-[10px] font-bold text-gray-400 mb-1.5">
                      Sua montadora está cadastrada com o WMI <span className="font-mono font-black text-gray-600">{montadoraWmi}</span> — todo chassi deve começar com esse prefixo.
                    </p>
                  )}
                  <input
                    type="text" required value={veiculoData.chassi}
                    onChange={e => setVeiculoData({ ...veiculoData, chassi: e.target.value.toUpperCase() })}
                    maxLength={17}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 font-mono transition-all uppercase"
                    placeholder="Ex: 8AFAAABBBR0000001"
                  />
                  <VINFeedback vin={veiculoData.chassi} expectedWmi={montadoraWmi} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Cor de Fábrica</label>
                  <input
                    type="text" required value={veiculoData.cor}
                    onChange={e => setVeiculoData({ ...veiculoData, cor: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 transition-all"
                    placeholder="Ex: Branco Pérola"
                  />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-100 uppercase tracking-widest text-xs disabled:opacity-50 transition-all">
                  {isSubmitting ? 'EMITINDO...' : 'CONFIRMAR FABRICAÇÃO'}
                </button>
              </form>
            </div>
          )}

          {/* ─── ABA INVENTÁRIO ─── */}
          {activeTab === 'inventario' && (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-4">
                <Search className="text-gray-300 w-6 h-6 ml-2" />
                <input type="text" placeholder="Filtrar por Chassi ou Modelo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-transparent border-none focus:ring-0 font-bold text-gray-700 outline-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInventory.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleViewDetails(v.chassi)}
                    disabled={loadingDetails}
                    className="text-left bg-white p-6 rounded-[24px] shadow-lg border border-gray-50 hover:border-blue-200 hover:shadow-xl transition-all cursor-pointer disabled:opacity-60"
                  >
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{v.modeloNome}</h3>
                    <div className="text-lg font-black text-blue-600 font-mono mb-4">{v.chassi}</div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                      <span className="text-[10px] font-bold text-gray-300 italic uppercase">Fabricado em {v.dataFabricacao}</span>
                      <span className="text-[10px] font-black text-gray-500 uppercase">{v.cor}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── ABA RECALL ─── */}
          {activeTab === 'recall' && (
            <div className="space-y-10">
              <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-4">
                <Search className="text-gray-300 w-6 h-6 ml-2" />
                <input type="text" placeholder="Filtrar histórico de recalls por Chassi ou ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-transparent border-none focus:ring-0 font-bold text-gray-700 outline-none" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-5 bg-white rounded-[32px] shadow-2xl p-8 border border-gray-100 h-fit">
                  <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                    <AlertTriangle className="text-amber-500" /> EMITIR REGISTRO DE RECALL
                  </h2>
                  <form onSubmit={handleAddRecall} className="space-y-6">

                    {/* Dropdown de chassi com busca */}
                    <div className="relative" ref={chassiDropdownRef}>
                      <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Veículo Afetado</label>
                      <button
                        type="button"
                        onClick={() => setChassiDropdownOpen(!chassiDropdownOpen)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-amber-500 outline-none font-bold text-gray-700 text-left flex justify-between items-center hover:bg-gray-100 transition-all"
                      >
                        <span className={recallData.chassi ? 'font-mono text-gray-700' : 'text-gray-400 font-medium'}>
                          {recallData.chassi || '— SELECIONE DO INVENTÁRIO —'}
                        </span>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${chassiDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {chassiDropdownOpen && (
                        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-slideUp">
                          <div className="p-3 bg-gray-50 border-b border-gray-100">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                autoFocus type="text" placeholder="Buscar no inventário..."
                                value={vehicleSearchTerm}
                                onChange={e => setVehicleSearchTerm(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-amber-500 shadow-sm outline-none transition-all"
                              />
                            </div>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto">
                            {filteredInventoryForChassi.length > 0 ? (
                              filteredInventoryForChassi.map(v => (
                                <button
                                  key={v.chassi} type="button"
                                  onClick={() => { setRecallData({ ...recallData, chassi: v.chassi }); setChassiDropdownOpen(false); }}
                                  className="w-full px-5 py-4 text-left hover:bg-amber-50 transition-colors border-b border-gray-50 last:border-none flex flex-col"
                                >
                                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{v.modeloNome}</span>
                                  <span className="text-sm font-black text-gray-900 font-mono tracking-tight">{v.chassi}</span>
                                </button>
                              ))
                            ) : (
                              <div className="px-5 py-10 text-center">
                                <p className="text-[10px] font-black text-gray-300 uppercase italic">Nenhum veículo encontrado</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">ID Oficial do Recall</label>
                      <input type="text" required value={recallData.recallId} onChange={e => setRecallData({ ...recallData, recallId: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-amber-500 outline-none font-bold text-gray-700 transition-all" placeholder="Ex: REC-2024-001" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Descrição do Problema / Solução</label>
                      <textarea required value={recallData.descricao} onChange={e => setRecallData({ ...recallData, descricao: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-amber-500 outline-none font-bold text-gray-700 min-h-[100px] transition-all resize-none" placeholder="Descreva os componentes afetados..." />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black hover:bg-amber-600 shadow-xl shadow-amber-100 uppercase tracking-widest text-xs disabled:opacity-50 transition-all">
                      {isSubmitting ? 'REGISTRANDO...' : 'PUBLICAR RECALL NA REDE'}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 space-y-6">
                  <h2 className="text-lg font-black text-gray-400 uppercase tracking-widest mb-4">Recalls Auditados no Catálogo</h2>
                  {filteredRecalls.length === 0 ? (
                    <div className="bg-gray-50 rounded-[32px] p-20 text-center border-2 border-dashed border-gray-100">
                      {searchTerm ? (
                        <>
                          <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum recall encontrado para "{searchTerm}"</p>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum recall ativo cadastrado</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredRecalls.map((recall, i) => (
                        <div key={i} className={`p-6 rounded-[28px] border-2 transition-all shadow-sm hover:shadow-md ${recall.resolvido ? 'bg-green-50/30 border-green-100' : 'bg-red-50/30 border-red-100'}`}>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-black uppercase text-gray-900 tracking-tight">{recall.recallId}</span>
                                <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-full ${recall.resolvido ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                                  {recall.resolvido ? 'Resolvido' : 'Pendente'}
                                </span>
                              </div>
                              <div className="text-lg font-black text-gray-900 font-mono">{recall.chassi}</div>
                            </div>
                            {!recall.resolvido && (
                              confirmingRecall?.recallId === recall.recallId && confirmingRecall?.chassi === recall.chassi ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-gray-500">Confirmar?</span>
                                  <button onClick={() => handleResolveRecall(recall)} disabled={isSubmitting} className="px-3 py-1 bg-green-600 text-white text-[10px] font-black rounded-lg hover:bg-green-700 transition-all">Sim</button>
                                  <button onClick={() => setConfirmingRecall(null)} className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black rounded-lg hover:bg-gray-200 transition-all">Não</button>
                                </div>
                              ) : (
                                <button onClick={() => setConfirmingRecall(recall)} disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 shadow-lg shadow-green-100 transition-all">
                                  Resolver
                                </button>
                              )
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-600 italic">"{recall.descricao}"</p>
                          <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-gray-300 uppercase italic">
                            <span>Emitido em: {recall.data}</span>
                            {recall.resolvido && <span className="text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> VERIFICADO</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de detalhes do veículo (Inventário) */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-[9997] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setSelectedVehicle(null)}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedVehicle(null)}
              className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all border border-gray-100"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2 pr-12">
              <ClipboardList className="w-6 h-6 text-blue-600" />
              Detalhes do Registro — {selectedVehicle.chassis}
            </h2>
            <VehicleHistoryDetails vehicleHistory={selectedVehicle} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ManufacturerPanel;
