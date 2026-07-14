import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const artifact = JSON.parse(
  readFileSync(join(__dirname, "RegistroVeicular.json"), "utf8")
);

const provider  = new ethers.JsonRpcProvider(process.env.RPC_URL);
const contract  = new ethers.Contract(process.env.CONTRACT_ADDRESS, artifact.abi, provider);
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_KEY);

const isReplay  = process.argv.includes("--replay");

// --- Handlers de eventos ---

async function onAtorRegistrado(conta, nome, papel, wmi, event) {
  const { tx_hash, bloco } = logMeta(event);
  await upsert("atores", {
    address: conta.toLowerCase(),
    nome,
    papel: Number(papel),
    ativo: true,
    wmi,
    tx_hash,
    bloco,
  }, "address");
}

async function onAtorRevogado(conta, event) {
  await supabase.from("atores")
    .update({ ativo: false })
    .eq("address", conta.toLowerCase());
}

async function onModeloAdicionado(id_modelo, modelo, ano, estilo, assinatura_marca, event) {
  const { tx_hash, bloco } = logMeta(event);
  await upsert("modelos", {
    id_modelo:       Number(id_modelo),
    nome:            modelo,
    ano:             Number(ano),
    estilo:          Number(estilo),
    montadora:       assinatura_marca.toLowerCase(),
    tx_hash,
    bloco,
  }, "id_modelo");
}

async function onVeiculoAdicionado(chassi, id_modelo, data_fabricacao, cor, assinatura_montadora, event) {
  const { tx_hash, bloco } = logMeta(event);
  await upsert("veiculos", {
    chassi,
    id_modelo:           Number(id_modelo),
    data_fabricacao:     new Date(Number(data_fabricacao) * 1000).toISOString(),
    cor_fabrica:         cor,
    montadora:           assinatura_montadora.toLowerCase(),
    tx_hash,
    bloco,
  }, "chassi");
}

async function onRegistroDonoAdicionado(chassi, novo_dono, data_comeco, localidade_id, tipo_uso, assinatura_reportador, event) {
  const { tx_hash, bloco } = logMeta(event);
  await insert("historico_donos", {
    chassi,
    dono:                  novo_dono.toLowerCase(),
    data_comeco:           new Date(Number(data_comeco) * 1000).toISOString(),
    localidade_id:         Number(localidade_id),
    tipo_uso:              Number(tipo_uso),
    assinatura_reportador: assinatura_reportador.toLowerCase(),
    tx_hash,
    bloco,
  });
}

async function onRegistroAcidenteAdicionado(chassi, data, local, gravidade, airbags_acionados, dano_estrutural, assinatura_reportador, event) {
  const { tx_hash, bloco } = logMeta(event);
  await insert("historico_acidentes", {
    chassi,
    data:                  new Date(Number(data) * 1000).toISOString(),
    local,
    gravidade:             Number(gravidade),
    airbags_acionados,
    dano_estrutural,
    assinatura_reportador: assinatura_reportador.toLowerCase(),
    tx_hash,
    bloco,
  });
}

async function onRegistroTituloAdicionado(chassi, data, tipo_titulo, detalhes, assinatura_reportador, event) {
  const { tx_hash, bloco } = logMeta(event);
  await insert("historico_titulos", {
    chassi,
    data:                  new Date(Number(data) * 1000).toISOString(),
    tipo_titulo:           Number(tipo_titulo),
    detalhes,
    assinatura_reportador: assinatura_reportador.toLowerCase(),
    tx_hash,
    bloco,
  });
}

async function onRegistroOdometroAdicionado(chassi, data, quilometragem, assinatura_reportador, event) {
  const { tx_hash, bloco } = logMeta(event);
  await insert("historico_odometro", {
    chassi,
    data:                  new Date(Number(data) * 1000).toISOString(),
    quilometragem:         Number(quilometragem),
    assinatura_reportador: assinatura_reportador.toLowerCase(),
    tx_hash,
    bloco,
  });
}

async function onRegistroServicoAdicionado(chassi, data, tipo, descricao, assinatura_oficina, event) {
  const { tx_hash, bloco } = logMeta(event);
  await insert("historico_servicos", {
    chassi,
    data:               new Date(Number(data) * 1000).toISOString(),
    tipo:               Number(tipo),
    descricao,
    assinatura_oficina: assinatura_oficina.toLowerCase(),
    tx_hash,
    bloco,
  });
}

async function onRegistroRecallAdicionado(chassi, data, recall_id, descricao, resolvido, assinatura_montadora, event) {
  const { tx_hash, bloco } = logMeta(event);
  await insert("historico_recalls", {
    chassi,
    data:                 new Date(Number(data) * 1000).toISOString(),
    recall_id,
    descricao,
    resolvido,
    assinatura_montadora: assinatura_montadora.toLowerCase(),
    tx_hash,
    bloco,
  });
}

async function onRegistroIdentificacaoAdicionado(chassi, data, cor, placa, assinatura_reportador, event) {
  const { tx_hash, bloco } = logMeta(event);
  await insert("historico_identificacao", {
    chassi,
    data:                  new Date(Number(data) * 1000).toISOString(),
    cor,
    placa,
    assinatura_reportador: assinatura_reportador.toLowerCase(),
    tx_hash,
    bloco,
  });
}

// --- Normaliza evento de queryFilter (log direto) e contract.on (EventPayload com .log) ---

function logMeta(event) {
  const log = event.log ?? event;
  const log_index = log.index ?? log.logIndex ?? 0;
  return { tx_hash: log.transactionHash, log_index, bloco: log.blockNumber };
}

// --- Supabase helpers ---

async function insert(table, data) {
  const { error } = await supabase.from(table).upsert(data, { onConflict: "tx_hash" });
  if (error) console.error(`[${table}] UPSERT error:`, error.message, data);
  else       console.log(`[${table}] UPSERT ok — bloco ${data.bloco}`);
}

async function upsert(table, data, conflictColumn) {
  const { error } = await supabase.from(table).upsert(data, { onConflict: conflictColumn });
  if (error) console.error(`[${table}] UPSERT error:`, error.message, data);
  else       console.log(`[${table}] UPSERT ok — bloco ${data.bloco}`);
}

// --- Listener live via polling de blocos (compatível com Hardhat local) ---

const eventHandlerMap = {
  AtorRegistrado:                   onAtorRegistrado,
  AtorRevogado:                     onAtorRevogado,
  ModeloAdicionado:                 onModeloAdicionado,
  VeiculoAdicionado:                onVeiculoAdicionado,
  RegistroDonoAdicionado:           onRegistroDonoAdicionado,
  RegistroAcidenteAdicionado:       onRegistroAcidenteAdicionado,
  RegistroTituloAdicionado:         onRegistroTituloAdicionado,
  RegistroOdometroAdicionado:       onRegistroOdometroAdicionado,
  RegistroServicoAdicionado:        onRegistroServicoAdicionado,
  RegistroRecallAdicionado:         onRegistroRecallAdicionado,
  RegistroIdentificacaoAdicionado:  onRegistroIdentificacaoAdicionado,
};

async function processarBloco(blockNumber, tentativa = 0) {
  try {
    for (const [eventName, handler] of Object.entries(eventHandlerMap)) {
      const events = await contract.queryFilter(eventName, blockNumber, blockNumber);
      for (const e of events) await handler(...e.args, e);
    }
  } catch (err) {
    const aindaNaoIndexado = err?.error?.code === -32602 || err?.message?.includes("beyond current head");
    if (aindaNaoIndexado && tentativa < 3) {
      const delay = (tentativa + 1) * 1000;
      console.warn(`Bloco ${blockNumber} ainda não indexado, tentando novamente em ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return processarBloco(blockNumber, tentativa + 1);
    }
    throw err;
  }
}

function registrarListeners() {
  let lastBlock = -1;

  // Process blockNumber - 1: the HTTP RPC endpoint may not have indexed the
  // just-announced block yet (WebSocket vs HTTP lag), causing -32602 errors.
  // One block of lag (~2 s on Polygon) is acceptable for this use case.
  provider.on("block", async (blockNumber) => {
    const target = blockNumber - 1;
    if (target <= lastBlock) return;
    lastBlock = target;
    try {
      await processarBloco(target);
    } catch (err) {
      console.error(`Erro ao processar bloco ${target}:`, err.message);
    }
  });

  console.log("Listeners ativos (poll por bloco). Aguardando eventos...");
}

// --- Replay: reprocessa todos os eventos desde o bloco 0 ---

async function replay() {
  console.log("Iniciando replay de todos os eventos históricos...");
  const currentBlock = await provider.getBlockNumber();

  // PublicNode suporta até 10.000 blocos por query
  const CHUNK = 10_000;

  // Bloco de deploy — evita varrer toda a história da Sepolia desde 2022
  // Defina DEPLOY_BLOCK no .env para máxima eficiência
  const deployBlock = process.env.DEPLOY_BLOCK
    ? parseInt(process.env.DEPLOY_BLOCK)
    : Math.max(0, currentBlock - 100_000);

  console.log(`Varrendo a partir do bloco ${deployBlock} (${currentBlock - deployBlock} blocos)\n`);

  const eventHandlers = {
    AtorRegistrado:                   (e) => onAtorRegistrado(...e.args, e),
    AtorRevogado:                     (e) => onAtorRevogado(...e.args, e),
    ModeloAdicionado:                 (e) => onModeloAdicionado(...e.args, e),
    VeiculoAdicionado:                (e) => onVeiculoAdicionado(...e.args, e),
    RegistroDonoAdicionado:           (e) => onRegistroDonoAdicionado(...e.args, e),
    RegistroAcidenteAdicionado:       (e) => onRegistroAcidenteAdicionado(...e.args, e),
    RegistroTituloAdicionado:         (e) => onRegistroTituloAdicionado(...e.args, e),
    RegistroOdometroAdicionado:       (e) => onRegistroOdometroAdicionado(...e.args, e),
    RegistroServicoAdicionado:        (e) => onRegistroServicoAdicionado(...e.args, e),
    RegistroRecallAdicionado:         (e) => onRegistroRecallAdicionado(...e.args, e),
    RegistroIdentificacaoAdicionado:  (e) => onRegistroIdentificacaoAdicionado(...e.args, e),
  };

  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  for (const [eventName, handler] of Object.entries(eventHandlers)) {
    let total = 0;
    for (let from = deployBlock; from <= currentBlock; from += CHUNK) {
      const to     = Math.min(from + CHUNK - 1, currentBlock);
      const events = await contract.queryFilter(eventName, from, to);
      for (const e of events) await handler(e);
      total += events.length;
      await delay(200);
    }
    console.log(`${eventName}: ${total} eventos processados`);
  }

  console.log("Replay concluído.");
}

// --- Main ---

async function main() {
  const network = await provider.getNetwork();
  console.log(`Conectado: chain ${network.chainId} | contrato ${process.env.CONTRACT_ADDRESS}`);

  if (isReplay) {
    await replay();
  }

  registrarListeners();
}

main().catch(console.error);
