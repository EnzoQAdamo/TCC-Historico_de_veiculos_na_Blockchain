/**
 * Camada de acesso ao banco off-chain (Supabase).
 * Toda leitura de histórico passa por aqui — escrita ainda vai direto ao contrato.
 */
import { supabase, supabaseConfigured } from '../config/supabase';
import { resolveLocation } from '../config/blockchain';
import { VehicleHistory, MaintenanceRecord, OfficialReport } from '../types';

// Enums espelhados do contrato para conversão
const ESTILO_MAP: Record<number, string> = {
  0: 'Desconhecido', 1: 'Sedan', 2: 'SUV', 3: 'Hatchback',
  4: 'Picape', 5: 'Coupé', 6: 'Van', 7: 'Motocicleta',
};
const TIPO_SERVICO_MAP: Record<number, MaintenanceRecord['type']> = {
  0: 'preventive', 1: 'corrective', 2: 'sinistro',
  3: 'revisao', 4: 'recall', 5: 'outros',
};

function notConfiguredError(): never {
  throw new Error('Supabase não configurado. Crie o arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
}

// --- Queries individuais ---

export async function getVeiculoCompleto(chassi: string) {
  if (!supabaseConfigured) notConfiguredError();

  const { data, error } = await supabase
    .from('veiculos')
    .select('*, modelos(*)')
    .eq('chassi', chassi)
    .maybeSingle();

  if (error) throw new Error(`Veículo não encontrado: ${error.message}`);
  return data;
}

export async function getIdentificacaoAtual(chassi: string) {
  if (!supabaseConfigured) notConfiguredError();

  const { data } = await supabase
    .from('historico_identificacao')
    .select('*')
    .eq('chassi', chassi)
    .order('data', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function getDonoAtual(chassi: string) {
  if (!supabaseConfigured) notConfiguredError();

  const { data } = await supabase
    .from('historico_donos')
    .select('*')
    .eq('chassi', chassi)
    .order('data_comeco', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function getHistoricoAcidentes(chassi: string) {
  if (!supabaseConfigured) notConfiguredError();

  const { data } = await supabase
    .from('historico_acidentes')
    .select('*')
    .eq('chassi', chassi)
    .order('data', { ascending: false });

  return data ?? [];
}

export async function getHistoricoTitulos(chassi: string) {
  if (!supabaseConfigured) notConfiguredError();

  const { data } = await supabase
    .from('historico_titulos')
    .select('*')
    .eq('chassi', chassi)
    .order('data', { ascending: false });

  return data ?? [];
}

export async function getHistoricoServicos(chassi: string) {
  if (!supabaseConfigured) notConfiguredError();

  const { data } = await supabase
    .from('historico_servicos')
    .select('*')
    .eq('chassi', chassi)
    .order('data', { ascending: false });

  return data ?? [];
}

export async function getHistoricoRecalls(chassi: string) {
  if (!supabaseConfigured) notConfiguredError();

  const { data } = await supabase
    .from('historico_recalls')
    .select('*')
    .eq('chassi', chassi)
    .order('data', { ascending: false });

  return data ?? [];
}

export async function getHistoricoOdometro(chassi: string) {
  if (!supabaseConfigured) notConfiguredError();

  const { data } = await supabase
    .from('historico_odometro')
    .select('*')
    .eq('chassi', chassi)
    .order('data', { ascending: false });

  return data ?? [];
}

export async function getHistoricoDonos(chassi: string) {
  if (!supabaseConfigured) notConfiguredError();

  const { data } = await supabase
    .from('historico_donos')
    .select('*')
    .eq('chassi', chassi)
    .order('data_comeco', { ascending: false });

  return data ?? [];
}

// Busca por placa — impossível on-chain, trivial no Supabase
export async function buscarPorPlaca(placa: string) {
  if (!supabaseConfigured) notConfiguredError();

  const { data } = await supabase
    .from('historico_identificacao')
    .select('chassi')
    .ilike('placa', placa.toUpperCase())
    .order('data', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.chassi ?? null;
}

// --- Histórico completo (para painéis de consulta) ---

export async function getHistoricoCompleto(chassi: string): Promise<VehicleHistory> {
  if (!supabaseConfigured) notConfiguredError();

  const [veiculo, identificacao, donos, acidentes, titulos, servicos, recalls, odometro] =
    await Promise.all([
      getVeiculoCompleto(chassi),
      getIdentificacaoAtual(chassi),
      getHistoricoDonos(chassi),
      getHistoricoAcidentes(chassi),
      getHistoricoTitulos(chassi),
      getHistoricoServicos(chassi),
      getHistoricoRecalls(chassi),
      getHistoricoOdometro(chassi),
    ]);

  if (!veiculo) throw new Error('Veículo não encontrado no banco de dados.');

  const modelo = veiculo.modelos;
  const donoAtual = donos[0];

  // Resolve cidade/estado via IBGE (local map + API fallback)
  let city = 'N/A';
  let state = 'N/A';
  if (donoAtual?.localidade_id) {
    const location = await resolveLocation(Number(donoAtual.localidade_id));
    const parts = location.split(' / ');
    city  = parts[0] ?? location;
    state = parts[1] ?? 'N/A';
  }

  // Busca nome da montadora na tabela de atores pelo endereço
  const { data: atorMontadora } = await supabase
    .from('atores')
    .select('nome')
    .eq('address', veiculo.montadora.toLowerCase())
    .maybeSingle();
  const manufacturingYear = new Date(veiculo.data_fabricacao).getFullYear();
  const ultimaKm = odometro[0]?.quilometragem ?? 0;

  // --- Score ---
  let score = 100;
  const riskFactors: string[] = [];

  const seenFactors = new Set<string>();
  const pushFactor = (label: string) => { if (!seenFactors.has(label)) { seenFactors.add(label); riskFactors.push(label); } };

  acidentes.forEach((a: any) => {
    if (a.gravidade === 1) { score -= 15; pushFactor('Sinistro de Gravidade Baixa'); }
    else if (a.gravidade === 2) { score -= 30; pushFactor('Sinistro de Gravidade Média'); }
    else if (a.gravidade === 3) { score -= 60; pushFactor('Sinistro de Gravidade Alta'); }
    else if (a.gravidade === 4) { score -= 100; pushFactor('Perda Total Registrada'); }
  });

  // Status mais recente de cada recall_id
  const latestRecalls = new Map<string, any>();
  recalls.forEach((r: any) => {
    const existing = latestRecalls.get(r.recall_id);
    if (!existing || new Date(r.data) > new Date(existing.data)) {
      latestRecalls.set(r.recall_id, r);
    }
  });
  const recallsConsolidados = Array.from(latestRecalls.values());
  if (recallsConsolidados.some((r: any) => !r.resolvido)) {
    score -= 15;
    pushFactor('Recall em Aberto Pendente');
  }

  titulos.forEach((t: any) => {
    if (t.tipo_titulo === 2) { score -= 55; pushFactor('Passagem por Leilão Detectada'); }
    else if (t.tipo_titulo === 3) { score -= 40; pushFactor('Veículo Recuperado de Sinistro'); }
    else if (t.tipo_titulo === 4 || t.tipo_titulo === 5) { score -= 80; pushFactor('Histórico de Inundação/Incêndio'); }
  });

  if (donos.length > 3) {
    score -= (donos.length - 3) * 5;
    riskFactors.push(`Alta Rotatividade de Donos (${donos.length})`);
  }

  const yearsActive = Math.max(1, new Date().getFullYear() - manufacturingYear);
  const isHighMileage = ultimaKm / yearsActive > 20000;

  // --- Mapear para tipos do frontend ---
  const maintenanceRecords: MaintenanceRecord[] = servicos.map((s: any, i: number) => ({
    id: `srv-${i}`,
    date: new Date(s.data).toISOString().split('T')[0],
    mileage: 0,
    description: s.descricao,
    workshop: s.assinatura_oficina,
    cost: 0,
    type: TIPO_SERVICO_MAP[s.tipo] ?? 'preventive',
    status: 'completed' as const,
  }));

  const recallRecords: MaintenanceRecord[] = recallsConsolidados.map((r: any) => ({
    id: r.recall_id,
    date: new Date(r.data).toISOString().split('T')[0],
    mileage: 0,
    description: `RECALL: ${r.descricao} (Ref: ${r.recall_id})`,
    workshop: 'Fabricante (Recall Oficial)',
    cost: 0,
    type: 'recall' as const,
    status: r.resolvido ? 'completed' : 'pending',
  }));

  const TITULO_TYPE_MAP: Record<number, OfficialReport['type']> = {
    2: 'auction', 3: 'salvage', 4: 'flood', 5: 'fire',
  };
  const TITULO_SEVERITY_MAP: Record<number, OfficialReport['severity']> = {
    2: 'medium', 3: 'medium', 4: 'high', 5: 'high',
  };
  const TITULO_DESC_MAP: Record<number, string> = {
    2: 'Veículo com passagem por leilão',
    3: 'Veículo recuperado de sinistro / reconstruído',
    4: 'Veículo com histórico de inundação',
    5: 'Veículo com histórico de incêndio',
  };

  const tituloReports: OfficialReport[] = titulos
    .filter((t: any) => t.tipo_titulo >= 2)
    .map((t: any, i: number) => ({
      id: `titulo-${i}`,
      type: TITULO_TYPE_MAP[t.tipo_titulo] ?? 'title',
      date: new Date(t.data).toISOString().split('T')[0],
      description: (TITULO_DESC_MAP[t.tipo_titulo] ?? 'Alteração de título') + (t.detalhes ? ` — ${t.detalhes}` : ''),
      location: '',
      severity: TITULO_SEVERITY_MAP[t.tipo_titulo] ?? 'medium',
      resolved: false,
      reportNumber: `TITULO-${i}`,
      authority: 'DETRAN',
    }));

  const officialReports: OfficialReport[] = [
    ...acidentes.map((a: any, i: number) => ({
      id: `acc-${i}`,
      type: 'accident' as const,
      date: new Date(a.data).toISOString().split('T')[0],
      description: `Dano Estrutural: ${a.dano_estrutural ? 'Sim' : 'Não'}`,
      location: a.local,
      severity: a.gravidade >= 3 ? 'high' : a.gravidade === 2 ? 'medium' : 'low',
      severity_raw: a.gravidade,
      resolved: false,
      reportNumber: `BO-${i}`,
      authority: 'DETRAN',
    })),
    ...tituloReports,
  ];

  return {
    chassis: chassi,
    plate: identificacao?.placa ?? 'N/A',
    brand: atorMontadora?.nome ?? veiculo.montadora,
    model: modelo?.nome ?? `Modelo #${veiculo.id_modelo}`,
    color: identificacao?.cor ?? veiculo.cor_fabrica,
    city,
    state,
    modelYear: modelo?.ano ?? manufacturingYear,
    manufacturingYear,
    chassisPrefix: chassi.substring(0, 6),
    fipePrice: 0,
    owners: donos.length,
    mileage: ultimaKm,
    riskScore: Math.max(0, score),
    riskFactors,
    isHighMileage,
    lastUpdate: new Date().toISOString().split('T')[0],
    maintenanceRecords,
    recalls: recallRecords,
    officialReports,
    pendingDebts: [],
  };
}

// --- Para painéis de escrita (verificação rápida on-chain) ---
export { supabaseConfigured };
