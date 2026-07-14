import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, UserPlus, Users, Trash2, Search, CheckCircle2, XCircle, Loader2, ChevronDown, AlertTriangle } from 'lucide-react';
import { getTodosAtores, registrarNovoAtor, revogarAtor, connectWallet } from '../config/blockchain';
import { useToast } from '../context/ToastContext';
import { BRAZILIAN_WMIS } from '../utils/vinValidator';

const PAPEIS = [
  { value: 0, label: 'Montadora',        emoji: '🚗' },
  { value: 1, label: 'DETRAN',           emoji: '🏛️' },
  { value: 2, label: 'Oficina Mecânica', emoji: '🔧' },
  { value: 3, label: 'Seguradora',       emoji: '🛡️' },
];

const AdminPanel: React.FC = () => {
  const { toast, blockUI, unblockUI } = useToast();
  const [atores, setAtores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmingAddress, setConfirmingAddress] = useState<string | null>(null);

  const [formData, setFormData] = useState({ address: '', nome: '', papel: 0, wmi: '' });
  const [papelDropdownOpen, setPapelDropdownOpen] = useState(false);
  const [wmiDropdownOpen, setWmiDropdownOpen] = useState(false);
  const papelDropdownRef = useRef<HTMLDivElement>(null);
  const wmiDropdownRef = useRef<HTMLDivElement>(null);

  const papeisLabel = ['Montadora', 'DETRAN', 'Oficina', 'Seguradora'];

  useEffect(() => { fetchAtores(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (papelDropdownRef.current && !papelDropdownRef.current.contains(e.target as Node))
        setPapelDropdownOpen(false);
      if (wmiDropdownRef.current && !wmiDropdownRef.current.contains(e.target as Node))
        setWmiDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchAtores = async () => {
    setIsLoading(true);
    try {
      setAtores(await getTodosAtores());
    } catch {
      toast('error', 'Não foi possível carregar a lista de atores.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.address || !formData.nome) {
      toast('warning', 'Preencha todos os campos antes de continuar.');
      return;
    }
    if (formData.papel === 0 && formData.wmi.length !== 3) {
      toast('warning', 'WMI obrigatório para montadoras — deve ter exatamente 3 caracteres.');
      return;
    }
    setIsSubmitting(true);
    blockUI('Confirme a transação no MetaMask...');
    try {
      const signer = await connectWallet();
      const tx = await registrarNovoAtor(signer, formData.address, formData.nome, formData.papel, formData.papel === 0 ? formData.wmi.toUpperCase() : '');
      blockUI('Aguardando confirmação na blockchain...', tx.hash);
      await tx.wait();
      toast('success', `${formData.nome} credenciado! · Tx: ${tx.hash.slice(0, 10)}...`);
      setFormData({ address: '', nome: '', papel: 0, wmi: '' });
      fetchAtores();
    } catch (e: any) {
      toast('error', 'Erro ao credenciar: ' + (e.reason || e.message));
    } finally {
      setIsSubmitting(false);
      unblockUI();
    }
  };

  const handleRevoke = async (address: string) => {
    blockUI('Confirme a transação no MetaMask...');
    try {
      const signer = await connectWallet();
      const tx = await revogarAtor(signer, address);
      blockUI('Aguardando confirmação na blockchain...', tx.hash);
      await tx.wait();
      toast('success', `Acesso revogado! · Tx: ${tx.hash.slice(0, 10)}...`);
      setConfirmingAddress(null);
      fetchAtores();
    } catch (e: any) {
      toast('error', 'Erro ao revogar: ' + (e.reason || e.message));
    } finally {
      unblockUI();
    }
  };

  const filteredAtores = atores.filter(a =>
    a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-indigo-600" />
            Painel de Governança
          </h1>
          <p className="text-gray-500 font-medium">Gestão centralizada de permissões e atores da rede.</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{atores.length}</div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Atores Totais</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 p-8 sticky top-24">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Credenciar Novo Ator
            </h2>

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Entidade</label>
                <input
                  type="text"
                  placeholder="Ex: Honda Brasil, Oficina Central..."
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Endereço da Carteira</label>
                <input
                  type="text"
                  placeholder="0x..."
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm transition-all"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Papel / Função</label>
                <div className="relative" ref={papelDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setPapelDropdownOpen(o => !o)}
                    className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all cursor-pointer flex justify-between items-center hover:bg-gray-100"
                  >
                    <span>{PAPEIS[formData.papel].emoji} {PAPEIS[formData.papel].label}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${papelDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {papelDropdownOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
                      {PAPEIS.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => { setFormData({ ...formData, papel: p.value }); setPapelDropdownOpen(false); }}
                          className={`w-full px-5 py-3.5 text-left flex items-center gap-3 text-sm font-bold transition-all hover:bg-indigo-50 hover:text-indigo-700 ${formData.papel === p.value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                        >
                          <span className="text-base">{p.emoji}</span>
                          <span>{p.label}</span>
                          {formData.papel === p.value && <CheckCircle2 className="w-4 h-4 ml-auto text-indigo-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Campo WMI — exibido apenas para Montadora */}
              {formData.papel === 0 && (
                <div ref={wmiDropdownRef}>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Código WMI <span className="text-[10px] font-normal text-gray-400">(3 chars — ISO 3779)</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setWmiDropdownOpen(o => !o)}
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all cursor-pointer flex justify-between items-center hover:bg-gray-100"
                    >
                      <span className={formData.wmi ? 'font-mono text-gray-900' : 'font-medium text-gray-400'}>
                        {formData.wmi ? `${formData.wmi.toUpperCase()} — ${BRAZILIAN_WMIS[formData.wmi.toUpperCase()]?.manufacturer ?? 'WMI personalizado'}` : 'Selecione o WMI...'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${wmiDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {wmiDropdownOpen && (
                      <div className="absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-slideUp max-h-64 overflow-y-auto">
                        {Object.entries(BRAZILIAN_WMIS).map(([code, info]) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => { setFormData({ ...formData, wmi: code }); setWmiDropdownOpen(false); }}
                            className={`w-full px-5 py-3 text-left flex items-center justify-between transition-all hover:bg-indigo-50 hover:text-indigo-700 ${formData.wmi.toUpperCase() === code ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                          >
                            <div>
                              <span className="font-mono font-black text-sm">{code}</span>
                              <span className="text-xs text-gray-400 ml-2">{info.manufacturer}</span>
                            </div>
                            {formData.wmi.toUpperCase() === code && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CONFIRMAR CREDENCIAMENTO'}
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-900">Entidades Credenciadas</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou carteira..."
                  className="pl-11 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Carregando...</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Entidade</th>
                      <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Papel</th>
                      <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">WMI</th>
                      <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium">
                    {filteredAtores.map((ator, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition-all">
                        <td className="px-8 py-5">
                          <div className="font-black text-gray-900">{ator.nome}</div>
                          <div className="text-xs font-mono text-gray-400">{ator.address.substring(0, 10)}...{ator.address.slice(-8)}</div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded-full border border-gray-200">
                            {papeisLabel[ator.papel] ?? 'Desconhecido'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          {ator.wmi ? (
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-black font-mono rounded-lg border border-blue-100" title={BRAZILIAN_WMIS[ator.wmi]?.manufacturer}>
                              {ator.wmi}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-8 py-5">
                          {ator.ativo ? (
                            <div className="flex items-center gap-1.5 text-green-600 text-xs font-black uppercase">
                              <CheckCircle2 className="w-4 h-4" /> Ativo
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-red-500 text-xs font-black uppercase">
                              <XCircle className="w-4 h-4" /> Revogado
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          {ator.ativo && (
                            confirmingAddress === ator.address ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /> Confirmar?
                                </span>
                                <button
                                  onClick={() => handleRevoke(ator.address)}
                                  className="px-3 py-1 bg-red-500 text-white text-xs font-black rounded-lg hover:bg-red-600 transition-all"
                                >
                                  Sim
                                </button>
                                <button
                                  onClick={() => setConfirmingAddress(null)}
                                  className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-black rounded-lg hover:bg-gray-200 transition-all"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmingAddress(ator.address)}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                title="Revogar Acesso"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredAtores.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-bold italic">
                          {searchTerm ? `Nenhuma entidade encontrada para "${searchTerm}"` : 'Nenhum ator registrado.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
