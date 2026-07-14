import React, { useState, useEffect } from 'react';
import { 
  Building2, UserPlus, AlertTriangle, Fingerprint, ShieldCheck, 
  RotateCcw, History, Search, CheckCircle2, AlertCircle, 
  Loader2, BadgeCheck, FileText, Palette, Hash
} from 'lucide-react';
import {
  connectWallet, getRegistroVeicularContract, hasRole
} from '../config/blockchain';
import { useToast } from '../context/ToastContext';

interface ActionLog {
  id: string;
  type: 'dono' | 'acidente' | 'identidade' | 'titulo';
  chassi: string;
  status: 'success' | 'pending' | 'error';
  timestamp: string;
  message: string;
}

const VEHICLE_USES = ["Desconhecido", "Pessoal", "Comercial", "Frota", "Aluguel"];
const IMPACT_SEVERITY = ["Desconhecida", "Baixa", "Média", "Alta", "Perda Total"];
const TITLE_TYPES = ["Desconhecido", "Limpo", "Leilão", "Reconstruído", "Inundação", "Queimado"];

const DMVPanel: React.FC = () => {
  const { toast, blockUI, unblockUI } = useToast();
  const [activeTab, setActiveTab] = useState<'dono' | 'acidente' | 'identidade' | 'titulo'>('dono');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [logs, setLogs] = useState<ActionLog[]>([]);

  // Estado da Busca Rápida (para validar antes de alterar)
  const [searchChassi, setSearchChassi] = useState('');
  const [searchResult, setSearchResult] = useState<{ exists: boolean; data: any } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Estados dos Formulários
  const [donoData, setDonoData] = useState({ chassi: '', novoDono: '', localidadeId: '3550308', tipoUso: '1' });
  const [acidenteData, setAcidenteData] = useState({ chassi: '', local: '', gravidade: '2', danoEstrutural: false, airbags: false });
  const [identidadeData, setIdentidadeData] = useState({ chassi: '', placa: '', cor: '' });
  const [tituloData, setTituloData] = useState({ chassi: '', tipo: '1', detalhes: '' });

  // Localidade Dinâmica (IBGE)
  const [citySearch, setCitySearch] = useState('');
  const [cityOptions, setCityOptions] = useState<{id: number, nome: string}[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      const signer = await connectWallet();
      const addr = await signer.getAddress();
      setUserAddress(addr);
      
      const isDMV = await hasRole(addr, "DMV");
      setHasPermission(isDMV);
    } catch {
      // permissão negada — hasPermission permanece false
    } finally {
      setIsLoadingRole(false);
    }
  };

  const addLog = (type: ActionLog['type'], chassi: string, status: ActionLog['status'], message: string) => {
    const newLog: ActionLog = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      chassi,
      status,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [newLog, ...prev].slice(0, 10)); // Mantém os últimos 10
  };

  const handleQuickSearch = async () => {
    if (!searchChassi.trim()) return;
    setIsSearching(true);
    try {
      const signer = await connectWallet();
      const contract = await getRegistroVeicularContract(signer);
      const existe = await contract.veiculoExiste(searchChassi.toUpperCase());
      
      if (existe) {
        const v = await contract.getVeiculo(searchChassi.toUpperCase());
        setSearchResult({ exists: true, data: v });
      } else {
        setSearchResult({ exists: false, data: null });
      }
    } catch {
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Handlers de Submissão
  const handleSubmit = async (type: ActionLog['type'], fn: () => Promise<any>) => {
    setIsSubmitting(true);
    const chassi = (activeTab === 'dono' ? donoData.chassi :
                   activeTab === 'acidente' ? acidenteData.chassi :
                   activeTab === 'identidade' ? identidadeData.chassi : tituloData.chassi).toUpperCase();

    blockUI('Confirme a transação no MetaMask...');
    try {
      const tx = await fn();
      blockUI('Aguardando confirmação na blockchain...', tx.hash);
      addLog(type, chassi, 'pending', `Aguardando mineração... · ${tx.hash.slice(0, 10)}...`);
      await tx.wait();
      addLog(type, chassi, 'success', `Confirmado! · Tx: ${tx.hash.slice(0, 10)}...`);
      toast('success', `Registro realizado! · Tx: ${tx.hash.slice(0, 10)}...`);
    } catch (err: any) {
      addLog(type, chassi, 'error', err.reason || 'Erro na transação');
      toast('error', 'Erro: ' + (err.reason || err.message));
    } finally {
      setIsSubmitting(false);
      unblockUI();
    }
  };

  const handleSearchCity = async (name: string) => {
    setCitySearch(name);
    if (name.length < 3) {
      setCityOptions([]);
      return;
    }
    
    setIsSearchingCity(true);
    try {
      const resp = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios`);
      const all: any[] = await resp.json();
      
      const mapped = all
        .filter(c => c.nome.toLowerCase().includes(name.toLowerCase()))
        .slice(0, 8)
        .map(c => ({
          id: Number(c.id),
          nome: `${c.nome} / ${c.microrregiao.mesorregiao.UF.sigla}`
        }));

      setCityOptions(mapped);
    } catch {
      // falha silenciosa — IBGE pode estar fora do ar
    } finally {
      setIsSearchingCity(false);
    }
  };

  if (isLoadingRole) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
        <p className="text-gray-600 font-medium">Validando credenciais do Órgão de Trânsito...</p>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-12 shadow-xl">
          <ShieldCheck className="w-20 h-20 text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-red-800 mb-4">Acesso Restrito ao DETRAN</h2>
          <p className="text-red-700 mb-8 max-w-md mx-auto">
            Sua carteira <b>{userAddress.substring(0,6)}...{userAddress.slice(-4)}</b> não possui permissões administrativas para este painel.
          </p>
          <div className="flex justify-center gap-4">
            <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold">
              <RotateCcw className="w-4 h-4" /> Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header Estilizado */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
               <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo DETRAN</h1>
          </div>
          <p className="text-gray-600">Gestão oficial de registro civil e histórico legal de veículos.</p>
        </div>
        
        <div className="bg-white/60 backdrop-blur-md border border-indigo-100 p-4 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Validar Chassi..." 
              value={searchChassi}
              onChange={e => setSearchChassi(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleQuickSearch()}
              className="pl-10 pr-4 py-2 border-none ring-1 ring-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 w-48 transition-all"
            />
          </div>
          <button 
            disabled={isSearching}
            onClick={handleQuickSearch}
            className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
          >
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Resultado da Busca Rápida (Floating Alert) */}
      {searchResult && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center justify-between border animate-slideDown ${searchResult.exists ? 'bg-green-50 border-green-100 text-green-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
          <div className="flex items-center gap-3">
            {searchResult.exists ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium text-sm">
              {searchResult.exists ? `Veículo ${searchChassi} localizado e apto para modificações.` : `Chassi ${searchChassi} não encontrado na base de dados.`}
            </span>
          </div>
          <button onClick={() => setSearchResult(null)} className="text-[10px] uppercase font-bold tracking-widest hover:underline">Fechar</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navegação e Formulários (Coluna Esquerda) */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2">
              {[
                { id: 'dono', icon: <UserPlus className="w-4 h-4" />, label: 'Transferência' },
                { id: 'identidade', icon: <Fingerprint className="w-4 h-4" />, label: 'Placa & Cor' },
                { id: 'titulo', icon: <BadgeCheck className="w-4 h-4" />, label: 'Situação Legal' },
                { id: 'acidente', icon: <AlertTriangle className="w-4 h-4" />, label: 'Acidentes' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div className="p-8">
              {/* Formulário: Dono */}
              {activeTab === 'dono' && (
                <form onSubmit={e => {
                  e.preventDefault();
                  handleSubmit('dono', async () => {
                    const signer = await connectWallet();
                    const contract = await getRegistroVeicularContract(signer);
                    return contract.addRegistroDono(donoData.chassi.toUpperCase(), donoData.novoDono, Math.floor(Date.now()/1000), Number(donoData.localidadeId), Number(donoData.tipoUso));
                  });
                }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Hash className="w-3 h-3" /> Chassi do Veículo</label>
                      <input type="text" required value={donoData.chassi} onChange={e => setDonoData({...donoData, chassi: e.target.value})} className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-mono" placeholder="ABC123XXX" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Palette className="w-3 h-3" /> Município (Busca IBGE)</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Digite o nome da cidade..." 
                          value={citySearch}
                          onChange={e => handleSearchCity(e.target.value)}
                          className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                        />
                        {isSearchingCity && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-indigo-400" />}
                        
                        {cityOptions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                            {cityOptions.map(opt => (
                              <div 
                                key={opt.id} 
                                onClick={() => {
                                  setDonoData({...donoData, localidadeId: opt.id.toString()});
                                  setCitySearch(opt.nome);
                                  setCityOptions([]);
                                }}
                                className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-gray-700 flex justify-between"
                              >
                                <span>{opt.nome}</span>
                                <span className="text-[9px] text-gray-400">ID: {opt.id}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-400 mt-1 italic">Dica: Selecione na lista para gravar o código IBGE oficial.</p>
                      <input type="hidden" value={donoData.localidadeId} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Carteira Web3 do Novo Proprietário</label>
                    <input type="text" required value={donoData.novoDono} onChange={e => setDonoData({...donoData, novoDono: e.target.value})} className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm" placeholder="0x..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Classificação de Uso</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                       {VEHICLE_USES.map((use, idx) => (
                        <button type="button" key={use} onClick={() => setDonoData({...donoData, tipoUso: idx.toString()})} className={`py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${donoData.tipoUso === idx.toString() ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 hover:bg-gray-50 text-gray-400'}`}>
                          {use}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />} {isSubmitting ? 'Processando...' : 'Efetuar Transferência de Propriedade'}
                  </button>
                </form>
              )}

              {/* Formulário: Identidade (Placa/Cor) */}
              {activeTab === 'identidade' && (
                <form onSubmit={e => {
                  e.preventDefault();
                  handleSubmit('identidade', async () => {
                    const signer = await connectWallet();
                    const contract = await getRegistroVeicularContract(signer);
                    return contract.addRegistroIdentificacao(identidadeData.chassi.toUpperCase(), identidadeData.cor, identidadeData.placa.toUpperCase());
                  });
                }} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Hash className="w-3 h-3" /> Chassi alvo</label>
                      <input type="text" required value={identidadeData.chassi} onChange={e => setIdentidadeData({...identidadeData, chassi: e.target.value})} className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-mono" placeholder="ABC123XXX" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nova Placa (Mercosul)</label>
                        <input type="text" required value={identidadeData.placa} onChange={e => setIdentidadeData({...identidadeData, placa: e.target.value})} className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:font-normal uppercase" placeholder="ABC1D23" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Cor Predominante</label>
                        <input type="text" required value={identidadeData.cor} onChange={e => setIdentidadeData({...identidadeData, cor: e.target.value})} className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Ex: Azul Metálico" />
                      </div>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50">
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Palette className="w-5 h-5" />} {isSubmitting ? 'Gravando dados...' : 'Atualizar Identidade Veicular'}
                    </button>
                    <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-semibold">Nota: Toda alteração de cor/placa é imutável e auditável.</p>
                </form>
              )}

              {/* Formulário: Título Legal */}
              {activeTab === 'titulo' && (
                <form onSubmit={e => {
                  e.preventDefault();
                  handleSubmit('titulo', async () => {
                    const signer = await connectWallet();
                    const contract = await getRegistroVeicularContract(signer);
                    return contract.addRegistroTitulo(tituloData.chassi.toUpperCase(), Math.floor(Date.now()/1000), Number(tituloData.tipo), tituloData.detalhes);
                  });
                }} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Hash className="w-3 h-3" /> Chassi alvo</label>
                    <input type="text" required value={tituloData.chassi} onChange={e => setTituloData({...tituloData, chassi: e.target.value})} className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-mono" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Qualificação do Título</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {TITLE_TYPES.map((type, idx) => (
                        <button type="button" key={type} onClick={() => setTituloData({...tituloData, tipo: idx.toString()})} className={`py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${tituloData.tipo === idx.toString() ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 hover:bg-gray-50 text-gray-400'}`}>
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Justificativa / Detalhes Oficiais</label>
                    <textarea value={tituloData.detalhes} onChange={e => setTituloData({...tituloData, detalhes: e.target.value})} className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 h-24 transition-all" placeholder="Descreva os motivos da mudança de título..." />
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-900 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <BadgeCheck className="w-5 h-5" />} {isSubmitting ? 'Processando Documento...' : 'Alterar Status do Título'}
                  </button>
                </form>
              )}

              {/* Formulário: Sinistro (Acidente) */}
              {activeTab === 'acidente' && (
                <form onSubmit={e => {
                  e.preventDefault();
                  handleSubmit('acidente', async () => {
                    const signer = await connectWallet();
                    const contract = await getRegistroVeicularContract(signer);
                    return contract.addRegistroAcidente(acidenteData.chassi.toUpperCase(), Math.floor(Date.now()/1000), acidenteData.local, Number(acidenteData.gravidade), acidenteData.airbags, acidenteData.danoEstrutural);
                  });
                }} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Hash className="w-3 h-3" /> Chassi Acidentado</label>
                    <input type="text" required value={acidenteData.chassi} onChange={e => setAcidenteData({...acidenteData, chassi: e.target.value})} className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-mono" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Área de Impacto no Veículo (Onde bateu?)</label>
                    <input type="text" required value={acidenteData.local} onChange={e => setAcidenteData({...acidenteData, local: e.target.value})} className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all font-mono" placeholder="Ex: Frontal Esquerda, Traseira" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Impacto Reportado</label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {IMPACT_SEVERITY.map((sev, idx) => (
                        <button type="button" key={sev} onClick={() => setAcidenteData({...acidenteData, gravidade: idx.toString()})} className={`py-2 px-2 rounded-xl border text-[9px] font-bold uppercase transition-all ${acidenteData.gravidade === idx.toString() ? 'border-red-600 bg-red-50 text-red-600' : 'border-gray-100 hover:bg-gray-50 text-gray-400'}`}>
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div onClick={() => setAcidenteData({...acidenteData, danoEstrutural: !acidenteData.danoEstrutural})} className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${acidenteData.danoEstrutural ? 'border-red-500 bg-red-50' : 'border-gray-100'}`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${acidenteData.danoEstrutural ? 'bg-red-500' : 'bg-gray-200'}`}>
                        {acidenteData.danoEstrutural && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-[10px] uppercase font-bold ${acidenteData.danoEstrutural ? 'text-red-700' : 'text-gray-400'}`}>Dano Estrutural</span>
                    </div>
                    <div onClick={() => setAcidenteData({...acidenteData, airbags: !acidenteData.airbags})} className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${acidenteData.airbags ? 'border-amber-500 bg-amber-50' : 'border-gray-100'}`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${acidenteData.airbags ? 'bg-amber-500' : 'bg-gray-200'}`}>
                        {acidenteData.airbags && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-[10px] uppercase font-bold ${acidenteData.airbags ? 'text-amber-700' : 'text-gray-400'}`}>Airbags Acionados</span>
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-red-600 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />} {isSubmitting ? 'Registrando B.O...' : 'Confirmar Registro de Sinistro'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Histórico Local (Coluna Direita) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gray-900 rounded-3xl p-6 shadow-xl text-white">
            <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 mb-6">
              <History className="w-4 h-4 text-indigo-400" /> Histórico de Transações
            </h2>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {logs.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500 text-xs uppercase font-semibold">Nenhuma ação recente.</p>
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="relative pl-6 pb-4 border-l border-gray-800 last:pb-0">
                    <div className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : log.status === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">{log.timestamp}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${log.type === 'dono' ? 'bg-blue-900 text-blue-300' : log.type === 'acidente' ? 'bg-red-900 text-red-300' : 'bg-indigo-900 text-indigo-300'}`}>
                        {log.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 font-medium">Chassi: <span className="font-mono text-indigo-400">{log.chassi}</span></p>
                    <p className="text-[11px] text-gray-400 mt-1">{log.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 shadow-xl text-white">
            <ShieldCheck className="w-8 h-8 opacity-20 mb-4" />
            <h3 className="font-bold text-lg mb-2">Ambiente Certificado</h3>
            <p className="text-indigo-100 text-sm leading-relaxed opacity-80">
              Todas as ações executadas neste painel são assinadas pela chave privada do órgão competente e registradas permanentemente na rede local 31337.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DMVPanel;
