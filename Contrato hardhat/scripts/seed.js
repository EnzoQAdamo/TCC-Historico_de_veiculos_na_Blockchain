const { ethers } = require("hardhat");
const contractArtifact = require("../artifacts/contracts/RegistroVeicular.sol/RegistroVeicular.json");

// Gas estimado por conta (+30% buffer sobre o custo base de cada operação)
// Toyota:   2 addModelo + 2 addVeiculo + 1 addRegistroRecall
const GAS_TOYOTA   = 1_050_000n;
// Honda:    1 addModelo + 1 addVeiculo
const GAS_HONDA    =   450_000n;
// Ford:     1 addModelo + 1 addVeiculo
const GAS_FORD     =   450_000n;
// VW:       1 addModelo + 1 addVeiculo
const GAS_VW       =   450_000n;
// Mercedes: 1 addModelo + 1 addVeiculo + 1 addRegistroRecall
const GAS_MERCEDES =   600_000n;
// DETRAN:   addRegistroIdentificacao x6 + addRegistroDono x9 + addRegistroAcidente x4 + addRegistroTitulo x4
const GAS_DETRAN   = 2_700_000n;
// Oficina:  addManutencao x18 (odometro + servico combinados)
const GAS_OFICINA  = 3_150_000n;

async function verificarFundosPorRole(contas, gasPrice) {
  const estimativas = [
    { signer: contas.toyota,    nome: "Toyota",   gas: GAS_TOYOTA   },
    { signer: contas.honda,     nome: "Honda",    gas: GAS_HONDA    },
    { signer: contas.ford,      nome: "Ford",     gas: GAS_FORD     },
    { signer: contas.vw,        nome: "VW",       gas: GAS_VW       },
    { signer: contas.mercedes,  nome: "Mercedes", gas: GAS_MERCEDES },
    { signer: contas.detran,    nome: "DETRAN",   gas: GAS_DETRAN   },
    { signer: contas.oficina,   nome: "Oficina",  gas: GAS_OFICINA  },
  ];

  console.log("=== Verificando saldos por role ===");
  console.log(`Gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei\n`);

  let algumInsuficiente = false;
  for (const { signer, nome, gas } of estimativas) {
    const saldo     = await ethers.provider.getBalance(signer.address);
    const necessario = gas * gasPrice;
    const ok        = saldo >= necessario;
    console.log(
      `  ${nome.padEnd(10)} saldo: ${ethers.formatEther(saldo).padStart(10)} ETH` +
      ` | necessário: ${ethers.formatEther(necessario)} ETH ${ok ? "✅" : "❌ INSUFICIENTE"}`
    );
    if (!ok) algumInsuficiente = true;
  }

  if (algumInsuficiente) {
    throw new Error(
      "\nSaldo insuficiente em uma ou mais contas de role.\n" +
      "Execute primeiro: npx hardhat run scripts/rebalance.js --network sepolia\n" +
      "Ou recarregue as contas em: https://sepoliafaucet.com"
    );
  }
  console.log("\n✅ Todos os saldos suficientes para o seed.\n");
}

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS não definido no .env — rode deploy.js primeiro");
  }

  const [admin, toyota, honda, ford, vw, mercedes, detran, oficina] = await ethers.getSigners();

  console.log("=== SEED — RegistroVeicular ===\n");
  console.log(`Contrato:  ${contractAddress}`);
  console.log(`Admin:     ${admin.address}`);
  console.log(`Toyota:    ${toyota.address}`);
  console.log(`Honda:     ${honda.address}`);
  console.log(`Ford:      ${ford.address}`);
  console.log(`VW:        ${vw.address}`);
  console.log(`Mercedes:  ${mercedes.address}`);
  console.log(`DETRAN:    ${detran.address}`);
  console.log(`Oficina:   ${oficina.address}\n`);

  const feeData  = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas;

  await verificarFundosPorRole({ toyota, honda, ford, vw, mercedes, detran, oficina }, gasPrice);

  const base = new ethers.Contract(contractAddress, contractArtifact.abi, admin);

  const contratoToyota   = base.connect(toyota);
  const contratoHonda    = base.connect(honda);
  const contratoFord     = base.connect(ford);
  const contratoVW       = base.connect(vw);
  const contratoMercedes = base.connect(mercedes);
  const contratoDetran   = base.connect(detran);
  const contratoOficina  = base.connect(oficina);

  const ts = (dateStr) => Math.floor(new Date(dateStr).getTime() / 1000);

  const SP  = 3550308;
  const RJ  = 3304557;
  const BH  = 3106200;
  const CWB = 4106902;
  const POA = 4314902;

  // Endereço nulo para representar "proprietário desconhecido / revendedor"
  const DEAD = "0x000000000000000000000000000000000000dEaD";

  // ===================================================================
  // VINs — WMI correto por montadora (ISO 3779)
  // Posição 10 = código do ano: L=2020, M=2021, N=2022, P=2023, R=2024
  // ===================================================================
  const c1 = "8AFAAABBBR0000001"; // Toyota Corolla XEi 2024
  const c2 = "93YAAABBBP0000002"; // Honda Civic Touring 2023
  const c3 = "9BFAAABBBN0000003"; // Ford Mustang GT 2022
  const c4 = "9BWAAABBBM0000004"; // Volkswagen Golf GTI 2021
  const c5 = "8AFAAABBBL0000005"; // Toyota SW4 Diamond 2020
  const c6 = "9BMAAABBBM0000006"; // Mercedes-Benz C 180 2021

  // ===================================================================
  // MODELOS — cada montadora registra apenas os seus próprios
  // IDs são sequenciais: Toyota→0,1 | Honda→2 | Ford→3 | VW→4 | Mercedes→5
  // ===================================================================
  console.log("Cadastrando modelos...");

  // Toyota: modelo 0 e modelo 1
  await (await contratoToyota.addModelo("Corolla XEi 2.0 Flex",      2024, 1)).wait(); // SEDAN
  await (await contratoToyota.addModelo("SW4 Diamond 2.8 TDI",       2020, 2)).wait(); // SUV
  console.log("  ✅ Toyota: Corolla XEi 2024 (id 0), SW4 Diamond 2020 (id 1)");

  // Honda: modelo 2
  await (await contratoHonda.addModelo("Civic Touring 1.5 Turbo",    2023, 1)).wait(); // SEDAN
  console.log("  ✅ Honda: Civic Touring 2023 (id 2)");

  // Ford: modelo 3
  await (await contratoFord.addModelo("Mustang GT 5.0 V8",           2022, 5)).wait(); // COUPE
  console.log("  ✅ Ford: Mustang GT 2022 (id 3)");

  // VW: modelo 4
  await (await contratoVW.addModelo("Golf GTI 2.0 TSI",              2021, 3)).wait(); // HATCHBACK
  console.log("  ✅ VW: Golf GTI 2021 (id 4)");

  // Mercedes: modelo 5
  await (await contratoMercedes.addModelo("C 180 EQ Boost Avantgarde", 2021, 1)).wait(); // SEDAN
  console.log("  ✅ Mercedes: C 180 EQ Boost 2021 (id 5)");

  console.log("");

  // ===================================================================
  // VEÍCULOS — cada montadora registra apenas com seu WMI
  // ===================================================================
  console.log("Cadastrando veículos...");

  const f1 = ts("2024-02-10");
  const f2 = ts("2023-05-15");
  const f3 = ts("2022-01-20");
  const f4 = ts("2021-11-10");
  const f5 = ts("2020-03-01");
  const f6 = ts("2021-06-15");

  await (await contratoToyota.addVeiculo(c1, 0, f1, "Prata Metálico")).wait();
  console.log(`  ✅ ${c1} - Corolla XEi 2024`);

  await (await contratoHonda.addVeiculo(c2, 2, f2, "Branco Pérola")).wait();
  console.log(`  ✅ ${c2} - Civic Touring 2023`);

  await (await contratoFord.addVeiculo(c3, 3, f3, "Vermelho Racing")).wait();
  console.log(`  ✅ ${c3} - Mustang GT 2022`);

  await (await contratoVW.addVeiculo(c4, 4, f4, "Azul Noite")).wait();
  console.log(`  ✅ ${c4} - Golf GTI 2021`);

  await (await contratoToyota.addVeiculo(c5, 1, f5, "Preto Eclipse")).wait();
  console.log(`  ✅ ${c5} - SW4 Diamond 2020`);

  await (await contratoMercedes.addVeiculo(c6, 5, f6, "Branco Polar")).wait();
  console.log(`  ✅ ${c6} - C 180 EQ Boost 2021`);

  console.log("");

  // ===================================================================
  // DETRAN — identificação e primeiro registro de proprietário
  // ===================================================================
  console.log("DETRAN — identificações e proprietários iniciais...");

  await (await contratoDetran.addRegistroIdentificacao(c1, "Prata",    "GHT7A21")).wait();
  await (await contratoDetran.addRegistroIdentificacao(c2, "Branco",   "HND4B32")).wait();
  await (await contratoDetran.addRegistroIdentificacao(c3, "Vermelho", "GTX5E00")).wait();
  await (await contratoDetran.addRegistroIdentificacao(c4, "Azul",     "GTI4C23")).wait();
  await (await contratoDetran.addRegistroIdentificacao(c5, "Preto",    "SW4D250")).wait();
  await (await contratoDetran.addRegistroIdentificacao(c6, "Branco",   "MBZ1C80")).wait();
  console.log("  ✅ Identificações registradas");

  // TipoUso: DESCONHECIDO=0, PESSOAL=1, COMERCIAL=2, FROTA=3, ALUGUEL=4
  await (await contratoDetran.addRegistroDono(c1, admin.address, f1 + 3600, SP, 1)).wait();
  await (await contratoDetran.addRegistroDono(c2, admin.address, f2 + 3600, RJ, 1)).wait();
  await (await contratoDetran.addRegistroDono(c3, admin.address, f3 + 3600, SP, 2)).wait();
  await (await contratoDetran.addRegistroDono(c4, admin.address, f4 + 3600, SP, 1)).wait();
  await (await contratoDetran.addRegistroDono(c5, admin.address, f5 + 3600, SP, 3)).wait();
  await (await contratoDetran.addRegistroDono(c6, admin.address, f6 + 3600, RJ, 1)).wait();
  console.log("  ✅ Primeiros proprietários registrados\n");

  // ===================================================================
  // CARRO 1 — Toyota Corolla XEi 2024 | Histórico limpo, 2 donos
  // ===================================================================
  console.log("--- C1: Toyota Corolla XEi 2024 | Histórico limpo ---");

  // TipoServico: PREVENTIVA=0, CORRETIVA=1, SINISTRO=2, REVISAO=3, RECALL=4, OUTROS=5
  await (await contratoOficina.addManutencao(c1, ts("2024-07-15"), 10000,
    "Revisão de 10.000 km: troca de óleo 0W-20 sintético, filtro de óleo, filtro de ar, inspeção de freios e calibragem de pneus.", 3)).wait();
  await (await contratoOficina.addManutencao(c1, ts("2024-12-20"), 20000,
    "Revisão de 20.000 km: troca de óleo e filtro, verificação do sistema de arrefecimento, alinhamento e balanceamento.", 3)).wait();
  await (await contratoDetran.addRegistroDono(c1, DEAD, ts("2025-03-10"), BH, 1)).wait();
  await (await contratoOficina.addManutencao(c1, ts("2025-09-05"), 32000,
    "Revisão de 30.000 km: troca de velas de ignição, filtro de combustível, fluido de freio DOT 4 e pastilhas dianteiras.", 3)).wait();
  console.log("  ✅ Histórico registrado\n");

  // ===================================================================
  // CARRO 2 — Honda Civic Touring 2023 | Batida traseira leve reparada
  // ===================================================================
  console.log("--- C2: Honda Civic Touring 2023 | Batida leve ---");

  await (await contratoOficina.addManutencao(c2, ts("2023-11-20"), 10000,
    "Revisão de 10.000 km em concessionária autorizada. Troca de óleo 0W-30, filtros e inspeção visual completa.", 3)).wait();
  // GravidadeImpacto: DESCONHECIDA=0, BAIXA=1, MEDIA=2, ALTA=3, PERDA_TOTAL=4
  await (await contratoDetran.addRegistroAcidente(c2, ts("2024-03-08"),
    "Colisão traseira leve no para-choque em engarrafamento na Av. Atlântica. Dano estético apenas, sem comprometimento estrutural.", 1, false, false)).wait();
  await (await contratoOficina.addManutencao(c2, ts("2024-04-01"), 18500,
    "Substituição de para-choque traseiro, lanternas e sensor de estacionamento. Pintura em cabine. Veículo aprovado em vistoria pós-reparo.", 2)).wait();
  await (await contratoOficina.addManutencao(c2, ts("2025-01-10"), 28000,
    "Revisão de 30.000 km: troca de correia dentada e tensionador, fluido de arrefecimento e filtro de cabine.", 3)).wait();
  console.log("  ✅ Histórico registrado\n");

  // ===================================================================
  // CARRO 3 — Ford Mustang GT 2022 | Sinistro total, dano estrutural
  // ===================================================================
  console.log("--- C3: Ford Mustang GT 2022 | Sinistro total ---");

  await (await contratoOficina.addManutencao(c3, ts("2022-09-14"), 15000,
    "Revisão de 15.000 km: troca de óleo 5W-50 sintético, filtros e inspeção de suspensão.", 3)).wait();
  await (await contratoDetran.addRegistroAcidente(c3, ts("2023-06-22"),
    "Colisão frontal de alta velocidade na Rodovia dos Bandeirantes (SP-348), km 47. Airbags acionados. Dano grave em longarina, passageiro-caixa e painel frontal. Chassi com deformação permanente identificada em vistoria.", 3, true, true)).wait();
  await (await contratoDetran.addRegistroAcidente(c3, ts("2023-07-10"),
    "Vistoria pós-sinistro identificou microfissuras adicionais na estrutura traseira do chassi. Possível dano preexistente.", 2, true, false)).wait();
  // TipoTitulo: DESCONHECIDO=0, LIMPO=1, LEILAO=2, RECONSTRUIDO=3, INUNDACAO=4, QUEIMADO=5
  await (await contratoDetran.addRegistroTitulo(c3, ts("2023-08-05"), 3,
    "Veículo declarado sinistro total pela seguradora Porto Seguro (sinistro nº 2023/847332). Título alterado para Recuperado de Sinistro conforme Resolução CONTRAN 809/2021.")).wait();
  await (await contratoOficina.addManutencao(c3, ts("2024-02-18"), 28000,
    "Reconstrução estrutural com substituição de longarinas dianteiras e travessa do painel. Laudo de vistoria estrutural emitido pelo DETRAN-SP após recuperação.", 2)).wait();
  await (await contratoDetran.addRegistroDono(c3, DEAD, ts("2024-03-01"), CWB, 2)).wait();
  console.log("  ✅ Histórico registrado\n");

  // ===================================================================
  // CARRO 4 — Volkswagen Golf GTI 2021 | Leilão judicial + incêndio
  // ===================================================================
  console.log("--- C4: VW Golf GTI 2021 | Leilão + incêndio ---");

  await (await contratoDetran.addRegistroTitulo(c4, ts("2022-08-14"), 2,
    "Veículo arrematado em leilão judicial promovido pelo 2º Vara Cível de Santo André (SP) — Processo nº 1004521-77.2022.8.26.0037.")).wait();
  await (await contratoDetran.addRegistroAcidente(c4, ts("2023-01-29"),
    "Princípio de incêndio no compartimento do motor durante deslocamento na Marginal Pinheiros. Controlado pelo Corpo de Bombeiros (ocorrência CB-SP 2023/00234). Dano severo na fiação e mangueiras de arrefecimento.", 2, false, false)).wait();
  await (await contratoDetran.addRegistroTitulo(c4, ts("2023-02-05"), 5,
    "Título atualizado para refletir histórico de dano por incêndio no motor conforme laudo técnico nº 2023/LAU-4521 emitido pelo DETRAN-SP.")).wait();
  await (await contratoOficina.addManutencao(c4, ts("2023-05-10"), 42000,
    "Reconstrução completa do compartimento do motor: substituição do chicote elétrico principal, bicos injetores, módulo ECU e mangueiras de arrefecimento. Teste de bancada aprovado.", 1)).wait();
  await (await contratoOficina.addManutencao(c4, ts("2024-03-22"), 55000,
    "Revisão pós-recuperação: troca de óleo, filtros, verificação de tensores e correias. Sistema elétrico sem irregularidades.", 3)).wait();
  console.log("  ✅ Histórico registrado\n");

  // ===================================================================
  // CARRO 5 — Toyota SW4 Diamond 2020 | Frota corporativa, recall atendido
  // ===================================================================
  console.log("--- C5: Toyota SW4 Diamond 2020 | Frota, recall ok ---");

  const revisoesSW4 = [
    [ts("2020-09-15"), 10000, "Revisão de 10.000 km: troca de óleo diesel 5W-30, filtro de óleo, filtro de combustível e inspeção do sistema de arrefecimento."],
    [ts("2021-05-20"), 20000, "Revisão de 20.000 km: troca de correia do alternador, filtro de ar, fluido de embreagem e inspeção de juntas homocinéticas."],
    [ts("2022-01-08"), 30000, "Revisão de 30.000 km: troca de fluido de freio DOT 4, pastilhas e discos dianteiros, verificação de folgas da suspensão traseira."],
    [ts("2022-11-30"), 40000, "Revisão de 40.000 km: troca de óleo do câmbio automático, filtro de câmbio, correia dentada e rolamento tensionador."],
    [ts("2023-10-05"), 50000, "Revisão de 50.000 km: alinhamento, balanceamento, higienização do ar-condicionado com ozônio e inspeção geral pré-venda."],
  ];
  for (const [data, km, desc] of revisoesSW4) {
    await (await contratoOficina.addManutencao(c5, data, km, desc, 3)).wait();
  }

  await (await contratoToyota.addRegistroRecall(c5, ts("2021-04-10"),
    "REC-TOYOTA-2021-014",
    "Substituição preventiva da válvula de alívio do sistema de injeção common rail. Risco de vazamento e incêndio em veículos produzidos entre jan/2019 e dez/2020. Campanha autorizada pela ANTT.",
    true)).wait();
  await (await contratoDetran.addRegistroDono(c5, DEAD, ts("2024-01-15"), POA, 1)).wait();
  console.log("  ✅ Histórico registrado\n");

  // ===================================================================
  // CARRO 6 — Mercedes-Benz C 180 2021 | Recall de airbag PENDENTE
  // ===================================================================
  console.log("--- C6: Mercedes-Benz C 180 2021 | Recall pendente ---");

  await (await contratoOficina.addManutencao(c6, ts("2022-01-10"), 10000,
    "Revisão de 10.000 km em concessionária autorizada Mercedes-Benz. Troca de óleo 0W-30 AMG, filtros e inspeção de 29 itens conforme checklist oficial.", 3)).wait();
  await (await contratoOficina.addManutencao(c6, ts("2022-11-25"), 20000,
    "Revisão de 20.000 km: troca de filtro de ar, filtro de combustível, velas de ignição e fluido de freio. Sistema MBUX sem falhas.", 3)).wait();
  await (await contratoOficina.addManutencao(c6, ts("2024-02-03"), 35000,
    "Revisão de 35.000 km: alinhamento, balanceamento, troca de pastilhas traseiras e atualização de software do módulo ESP.", 3)).wait();
  await (await contratoMercedes.addRegistroRecall(c6, ts("2024-05-20"),
    "REC-MB-2024-008",
    "Substituição do inflador do airbag frontal do motorista (fornecedor Takata). Risco de ruptura metálica com projeção de fragmentos. Campanha obrigatória — DENATRAN Nota Técnica 2024/NT-0047. RECALL NÃO ATENDIDO.",
    false)).wait();
  console.log("  ✅ Histórico registrado\n");

  // ===================================================================
  console.log("✅ Seed concluído com sucesso!\n");
  console.log("Veículos cadastrados:");
  console.log(`  ${c1} (GHT7A21) - Corolla XEi 2024   | Histórico limpo, 2 donos`);
  console.log(`  ${c2} (HND4B32) - Civic Touring 2023 | Batida leve reparada`);
  console.log(`  ${c3} (GTX5E00) - Mustang GT 2022     | Sinistro total, dano estrutural`);
  console.log(`  ${c4} (GTI4C23) - Golf GTI 2021       | Leilão judicial + incêndio`);
  console.log(`  ${c5} (SW4D250) - SW4 Diamond 2020    | Frota corporativa, recall atendido`);
  console.log(`  ${c6} (MBZ1C80) - C 180 EQ Boost 2021 | Recall de airbag PENDENTE`);

  console.log("\nSaldos após o seed:");
  for (const [nome, signer] of [
    ["Admin",    admin],
    ["Toyota",   toyota],
    ["Honda",    honda],
    ["Ford",     ford],
    ["VW",       vw],
    ["Mercedes", mercedes],
    ["DETRAN",   detran],
    ["Oficina",  oficina],
  ]) {
    const bal = await ethers.provider.getBalance(signer.address);
    console.log(`  ${nome.padEnd(10)} ${ethers.formatEther(bal)} ETH`);
  }
  console.log("\n>> Para reequilibrar os saldos rode:");
  console.log("   npx hardhat run scripts/rebalance.js --network sepolia");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
