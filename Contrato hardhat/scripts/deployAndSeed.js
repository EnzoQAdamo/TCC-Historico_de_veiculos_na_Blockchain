const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("Iniciando deploy (UUPS Proxy) e povoamento da blockchain...\n");

  const [
    admin,
    toyota, honda, ford, vw, mercedes,
    detran, oficina,
    comprador1, comprador2
  ] = await ethers.getSigners();

  console.log(`Admin:     ${admin.address}`);
  console.log(`Toyota:    ${toyota.address}`);
  console.log(`Honda:     ${honda.address}`);
  console.log(`Ford:      ${ford.address}`);
  console.log(`VW:        ${vw.address}`);
  console.log(`Mercedes:  ${mercedes.address}`);
  console.log(`DETRAN:    ${detran.address}`);
  console.log(`Oficina:   ${oficina.address}\n`);

  // -------------------------------------------------------------------
  // Financiar contas de role se necessário
  // -------------------------------------------------------------------
  const roleAccounts = [toyota, honda, ford, vw, mercedes, detran, oficina];
  const uniqueRoles = roleAccounts.filter(s => s.address !== admin.address);

  if (uniqueRoles.length > 0) {
    console.log("Financiando contas de role com 0.05 ETH cada...");
    for (const signer of uniqueRoles) {
      const bal = await ethers.provider.getBalance(signer.address);
      if (bal < ethers.parseEther("0.02")) {
        const tx = await admin.sendTransaction({ to: signer.address, value: ethers.parseEther("0.05") });
        await tx.wait();
        console.log(`  ✅ Enviado 0.05 ETH → ${signer.address}`);
      } else {
        console.log(`  ⏭  ${signer.address} já tem saldo suficiente`);
      }
    }
    console.log();
  }

  // -------------------------------------------------------------------
  // Deploy via UUPS Proxy
  // -------------------------------------------------------------------
  console.log("Fazendo deploy do contrato...");
  const RegistroVeicular = await ethers.getContractFactory("RegistroVeicular");
  const registroVeicular = await upgrades.deployProxy(
    RegistroVeicular,
    [admin.address],
    { kind: "uups", initializer: "initialize" }
  );
  await registroVeicular.waitForDeployment();
  const contractAddress = await registroVeicular.getAddress();

  console.log(`\n======================================================`);
  console.log(`✅ Proxy UUPS deployado em: ${contractAddress}`);
  console.log(`>> Copie este endereço para Front-end/src/config/blockchain.ts`);
  console.log(`======================================================\n`);

  // -------------------------------------------------------------------
  // Registrar atores — admin NÃO é registrado como ator de negócio
  // PapelAtor: 0=MONTADORA, 1=AUTORIDADE(DMV), 2=OFICINA, 3=SEGURADORA, 4=CONCESSIONARIA
  // -------------------------------------------------------------------
  console.log("Registrando atores...");

  // Montadoras — cada uma com seu WMI ISO 3779 real
  await (await registroVeicular.registrarAtor(toyota.address,   "Toyota do Brasil Ltda.",                   0, "8AF")).wait();
  await (await registroVeicular.registrarAtor(honda.address,    "Honda Automóveis do Brasil Ltda.",          0, "93Y")).wait();
  await (await registroVeicular.registrarAtor(ford.address,     "Ford Motor Company Brasil Ltda.",           0, "9BF")).wait();
  await (await registroVeicular.registrarAtor(vw.address,       "Volkswagen do Brasil Indústria de Veículos Motores Ltda.", 0, "9BW")).wait();
  await (await registroVeicular.registrarAtor(mercedes.address, "Mercedes-Benz do Brasil Ltda.",             0, "9BM")).wait();

  // Autoridades e prestadores
  await (await registroVeicular.registrarAtor(detran.address,   "DETRAN-SP — Departamento Estadual de Trânsito de São Paulo", 1, "")).wait();
  await (await registroVeicular.registrarAtor(oficina.address,  "Oficina Autorizada Centro Automotivo Paulista",              2, "")).wait();

  console.log("Atores registrados.\n");

  // Helper de timestamp
  const ts = (dateStr) => Math.floor(new Date(dateStr).getTime() / 1000);

  // Códigos IBGE de municípios reais
  const SP  = 3550308; // São Paulo - SP
  const RJ  = 3304557; // Rio de Janeiro - RJ
  const BH  = 3106200; // Belo Horizonte - MG
  const CWB = 4106902; // Curitiba - PR
  const POA = 4314902; // Porto Alegre - RS

  // -------------------------------------------------------------------
  // Modelos — cada montadora registra apenas os seus
  // EstiloVeiculo: 0=DESCONHECIDO 1=SEDAN 2=SUV 3=HATCHBACK 4=PICAPE 5=COUPE 6=VAN 7=MOTOCICLETA
  // -------------------------------------------------------------------
  console.log("Cadastrando modelos de veículos...");

  await (await registroVeicular.connect(toyota).addModelo("Corolla XEi 2.0 Flex",      2024, 1)).wait(); // id 0
  await (await registroVeicular.connect(toyota).addModelo("SW4 Diamond 2.8 TDI",       2020, 2)).wait(); // id 1
  await (await registroVeicular.connect(honda).addModelo("Civic Touring 1.5 Turbo",    2023, 1)).wait(); // id 2
  await (await registroVeicular.connect(ford).addModelo("Mustang GT 5.0 V8",           2022, 5)).wait(); // id 3
  await (await registroVeicular.connect(vw).addModelo("Golf GTI 2.0 TSI",              2021, 3)).wait(); // id 4
  await (await registroVeicular.connect(mercedes).addModelo("C 180 EQ Boost Avantgarde", 2021, 1)).wait(); // id 5

  console.log("Modelos cadastrados.\n");

  // -------------------------------------------------------------------
  // VINs — 17 chars, sem I/O/Q, WMI correto por marca
  // Posição 10 = ano modelo: R=2024, P=2023, N=2022, M=2021, L=2020
  // -------------------------------------------------------------------
  const c1 = "8AFAAABBBR0000001"; // Toyota Corolla 2024   (WMI: 8AF)
  const c2 = "93YAAABBBP0000002"; // Honda Civic 2023      (WMI: 93Y)
  const c3 = "9BFAAABBBN0000003"; // Ford Mustang 2022     (WMI: 9BF)
  const c4 = "9BWAAABBBM0000004"; // VW Golf 2021          (WMI: 9BW)
  const c5 = "8AFAAABBBL0000005"; // Toyota SW4 2020       (WMI: 8AF)
  const c6 = "9BMAAABBBM0000006"; // Mercedes C 180 2021   (WMI: 9BM)

  // ===================================================================
  // CARRO 1 — Toyota Corolla XEi 2024
  // Histórico: bem mantido, 2 donos, revisões em concessionária
  // ===================================================================
  console.log("--- CARRO 1: Toyota Corolla XEi (histórico limpo) ---");
  await (await registroVeicular.connect(toyota).addVeiculo(c1, 0, ts("2024-02-10"), "Prata Metálico")).wait();
  await (await registroVeicular.connect(detran).addRegistroIdentificacao(c1, "Prata", "GHT7A21")).wait();
  await (await registroVeicular.connect(detran).addRegistroDono(c1, comprador1.address, ts("2024-02-10"), SP, 1)).wait();

  await (await registroVeicular.connect(oficina).addManutencao(c1, ts("2024-07-15"), 10000,
    "Revisão de 10.000 km: troca de óleo 0W-20 sintético, filtro de óleo, filtro de ar, inspeção de freios e calibragem de pneus.", 3)).wait();
  await (await registroVeicular.connect(oficina).addManutencao(c1, ts("2024-12-20"), 20000,
    "Revisão de 20.000 km: troca de óleo e filtro, verificação do sistema de arrefecimento, alinhamento e balanceamento.", 3)).wait();

  await (await registroVeicular.connect(detran).addRegistroDono(c1, comprador2.address, ts("2025-03-10"), BH, 1)).wait();

  await (await registroVeicular.connect(oficina).addManutencao(c1, ts("2025-09-05"), 32000,
    "Revisão de 30.000 km: troca de velas de ignição, filtro de combustível, fluido de freio DOT 4 e pastilhas dianteiras.", 3)).wait();

  // ===================================================================
  // CARRO 2 — Honda Civic Touring 2023
  // Histórico: batida traseira leve, reparado, único dono
  // ===================================================================
  console.log("--- CARRO 2: Honda Civic Touring (batida leve reparada) ---");
  await (await registroVeicular.connect(honda).addVeiculo(c2, 2, ts("2023-05-15"), "Branco Pérola")).wait();
  await (await registroVeicular.connect(detran).addRegistroIdentificacao(c2, "Branco", "HND4B32")).wait();
  await (await registroVeicular.connect(detran).addRegistroDono(c2, comprador1.address, ts("2023-05-15"), RJ, 1)).wait();

  await (await registroVeicular.connect(oficina).addManutencao(c2, ts("2023-11-20"), 10000,
    "Revisão de 10.000 km em concessionária autorizada. Troca de óleo 0W-30, filtros e inspeção visual completa.", 3)).wait();

  await (await registroVeicular.connect(detran).addRegistroAcidente(c2, ts("2024-03-08"),
    "Colisão traseira leve no para-choque em engarrafamento na Av. Atlântica. Dano estético apenas, sem comprometimento estrutural.", 1, false, false)).wait();

  await (await registroVeicular.connect(oficina).addManutencao(c2, ts("2024-04-01"), 18500,
    "Substituição de para-choque traseiro, lanternas e sensor de estacionamento. Pintura em cabine. Veículo aprovado em vistoria pós-reparo.", 2)).wait();

  await (await registroVeicular.connect(oficina).addManutencao(c2, ts("2025-01-10"), 28000,
    "Revisão de 30.000 km: troca de correia dentada e tensionador, fluido de arrefecimento e filtro de cabine.", 3)).wait();

  // ===================================================================
  // CARRO 3 — Ford Mustang GT 2022
  // Histórico: sinistro grave, dano estrutural, título recuperado
  // ===================================================================
  console.log("--- CARRO 3: Ford Mustang GT (sinistro total / dano estrutural) ---");
  await (await registroVeicular.connect(ford).addVeiculo(c3, 3, ts("2022-01-20"), "Vermelho Racing")).wait();
  await (await registroVeicular.connect(detran).addRegistroIdentificacao(c3, "Vermelho", "GTX5E00")).wait();
  await (await registroVeicular.connect(detran).addRegistroDono(c3, comprador1.address, ts("2022-01-20"), SP, 2)).wait();

  await (await registroVeicular.connect(oficina).addManutencao(c3, ts("2022-09-14"), 15000,
    "Revisão de 15.000 km: troca de óleo 5W-50 sintético, filtros e inspeção de suspensão.", 3)).wait();

  await (await registroVeicular.connect(detran).addRegistroAcidente(c3, ts("2023-06-22"),
    "Colisão frontal de alta velocidade na Rodovia dos Bandeirantes (SP-348), km 47. Airbags acionados. Dano grave em longarina, passageiro-caixa e painel frontal. Chassi com deformação permanente identificada em vistoria.", 3, true, true)).wait();

  await (await registroVeicular.connect(detran).addRegistroAcidente(c3, ts("2023-07-10"),
    "Vistoria pós-sinistro identificou microfissuras adicionais na estrutura traseira do chassi. Possível dano preexistente.", 2, true, false)).wait();

  await (await registroVeicular.connect(detran).addRegistroTitulo(c3, ts("2023-08-05"),
    3, "Veículo declarado sinistro total pela seguradora Porto Seguro (sinistro nº 2023/847332). Título alterado para Recuperado de Sinistro conforme Resolução CONTRAN 809/2021.")).wait();

  await (await registroVeicular.connect(oficina).addManutencao(c3, ts("2024-02-18"), 28000,
    "Reconstrução estrutural com substituição de longarinas dianteiras e travessa do painel. Laudo de vistoria estrutural emitido pelo DETRAN-SP após recuperação.", 2)).wait();

  await (await registroVeicular.connect(detran).addRegistroDono(c3, comprador2.address, ts("2024-03-01"), CWB, 2)).wait();

  // ===================================================================
  // CARRO 4 — Volkswagen Golf GTI 2021
  // Histórico: arrematado em leilão judicial, dano por incêndio no motor
  // ===================================================================
  console.log("--- CARRO 4: Volkswagen Golf GTI (leilão judicial + incêndio) ---");
  await (await registroVeicular.connect(vw).addVeiculo(c4, 4, ts("2021-11-10"), "Azul Noite")).wait();
  await (await registroVeicular.connect(detran).addRegistroIdentificacao(c4, "Azul", "GTI4C23")).wait();
  await (await registroVeicular.connect(detran).addRegistroDono(c4, comprador2.address, ts("2021-11-10"), SP, 1)).wait();

  await (await registroVeicular.connect(detran).addRegistroTitulo(c4, ts("2022-08-14"),
    2, "Veículo arrematado em leilão judicial promovido pelo 2º Vara Cível de Santo André (SP) — Processo nº 1004521-77.2022.8.26.0037.")).wait();

  await (await registroVeicular.connect(detran).addRegistroAcidente(c4, ts("2023-01-29"),
    "Princípio de incêndio no compartimento do motor durante deslocamento na Marginal Pinheiros. Controlado pelo Corpo de Bombeiros (CB-SP 2023/00234). Dano severo na fiação, mangueiras e caixa de ar.", 2, false, false)).wait();

  await (await registroVeicular.connect(detran).addRegistroTitulo(c4, ts("2023-02-05"),
    5, "Título atualizado para refletir histórico de dano por incêndio no motor conforme laudo técnico nº 2023/LAU-4521 emitido pelo DETRAN-SP.")).wait();

  await (await registroVeicular.connect(oficina).addManutencao(c4, ts("2023-05-10"), 42000,
    "Reconstrução completa do compartimento do motor: substituição do chicote elétrico principal, bicos injetores, módulo ECU e mangueiras de arrefecimento.", 1)).wait();

  await (await registroVeicular.connect(oficina).addManutencao(c4, ts("2024-03-22"), 55000,
    "Revisão pós-recuperação: troca de óleo, filtros, verificação de tensores e correias. Sistema elétrico sem irregularidades.", 3)).wait();

  // ===================================================================
  // CARRO 5 — Toyota SW4 Diamond 2020
  // Histórico: frota corporativa, revisões completas e recall atendido
  // ===================================================================
  console.log("--- CARRO 5: Toyota SW4 Diamond (frota corporativa / recall atendido) ---");
  await (await registroVeicular.connect(toyota).addVeiculo(c5, 1, ts("2020-03-01"), "Preto Eclipse")).wait();
  await (await registroVeicular.connect(detran).addRegistroIdentificacao(c5, "Preto", "SW4K2D5")).wait();
  await (await registroVeicular.connect(detran).addRegistroDono(c5, comprador1.address, ts("2020-03-01"), SP, 3)).wait();

  await (await registroVeicular.connect(toyota).addRegistroRecall(c5, ts("2021-04-10"),
    "REC-TOYOTA-2021-014",
    "Substituição preventiva da válvula de alívio do sistema de injeção de combustível common rail. Falha pode causar vazamento e risco de incêndio em veículos produzidos entre jan/2019 e dez/2020. Campanha autorizada pela ANTT.", true)).wait();

  const revisoesSW4 = [
    [ts("2020-09-15"), 10000,  "Revisão de 10.000 km: troca de óleo diesel 5W-30, filtro de óleo, filtro de combustível e inspeção do sistema de arrefecimento."],
    [ts("2021-05-20"), 20000,  "Revisão de 20.000 km: troca de correia do alternador, filtro de ar, fluido de embreagem e inspeção de juntas homocinéticas."],
    [ts("2022-01-08"), 30000,  "Revisão de 30.000 km: troca de fluido de freio DOT 4, pastilhas e discos dianteiros, verificação de folgas da suspensão traseira."],
    [ts("2022-11-30"), 40000,  "Revisão de 40.000 km: troca de óleo do câmbio automático, filtro de câmbio, correia dentada e rolamento tensionador."],
    [ts("2023-10-05"), 50000,  "Revisão de 50.000 km: alinhamento, balanceamento, higienização do ar-condicionado com ozônio e inspeção geral pré-venda."],
  ];

  for (const [data, km, desc] of revisoesSW4) {
    await (await registroVeicular.connect(oficina).addManutencao(c5, data, km, desc, 3)).wait();
  }

  await (await registroVeicular.connect(detran).addRegistroDono(c5, comprador2.address, ts("2024-01-15"), POA, 1)).wait();

  // ===================================================================
  // CARRO 6 — Mercedes-Benz C 180 2021
  // Histórico: único dono, bem conservado, recall de airbag PENDENTE
  // ===================================================================
  console.log("--- CARRO 6: Mercedes-Benz C 180 (recall de airbag pendente) ---");
  await (await registroVeicular.connect(mercedes).addVeiculo(c6, 5, ts("2021-06-15"), "Branco Polar")).wait();
  await (await registroVeicular.connect(detran).addRegistroIdentificacao(c6, "Branco", "MBZ1C80")).wait();
  await (await registroVeicular.connect(detran).addRegistroDono(c6, comprador1.address, ts("2021-06-15"), RJ, 1)).wait();

  await (await registroVeicular.connect(oficina).addManutencao(c6, ts("2022-01-10"), 10000,
    "Revisão de 10.000 km em concessionária autorizada Mercedes-Benz. Troca de óleo 0W-30 AMG, filtros e inspeção de 29 itens conforme checklist oficial.", 3)).wait();
  await (await registroVeicular.connect(oficina).addManutencao(c6, ts("2022-11-25"), 20000,
    "Revisão de 20.000 km: troca de filtro de ar, filtro de combustível, velas de ignição e fluido de freio. Sistema MBUX sem falhas.", 3)).wait();
  await (await registroVeicular.connect(oficina).addManutencao(c6, ts("2024-02-03"), 35000,
    "Revisão de 35.000 km: alinhamento, balanceamento, troca de pastilhas traseiras e atualização de software do módulo ESP.", 3)).wait();

  await (await registroVeicular.connect(mercedes).addRegistroRecall(c6, ts("2024-05-20"),
    "REC-MB-2024-008",
    "Substituição do inflador do airbag frontal do motorista (fornecedor Takata). Risco de ruptura do invólucro metálico com projeção de fragmentos. Campanha obrigatória — DENATRAN Nota Técnica 2024/NT-0047. RECALL AINDA NÃO ATENDIDO.", false)).wait();

  // ===================================================================
  console.log("\n✅ Seed concluído com sucesso!");
  console.log(`\nEndereço do contrato: ${contractAddress}`);
  console.log(`\nContas por papel:`);
  console.log(`  Admin (deploy):  ${admin.address}`);
  console.log(`  Toyota (8AF):    ${toyota.address}`);
  console.log(`  Honda  (93Y):    ${honda.address}`);
  console.log(`  Ford   (9BF):    ${ford.address}`);
  console.log(`  VW     (9BW):    ${vw.address}`);
  console.log(`  Mercedes (9BM):  ${mercedes.address}`);
  console.log(`  DETRAN:          ${detran.address}`);
  console.log(`  Oficina:         ${oficina.address}`);
  console.log(`\nVeículos cadastrados:`);
  console.log(`  ${c1} (GHT7A21) - Corolla XEi 2024    | Histórico limpo, 2 donos, revisões em dia`);
  console.log(`  ${c2} (HND4B32) - Civic Touring 2023  | Batida traseira leve reparada, único dono`);
  console.log(`  ${c3} (GTX5E00) - Mustang GT 2022      | Sinistro total, dano estrutural, título recuperado`);
  console.log(`  ${c4} (GTI4C23) - Golf GTI 2021        | Leilão judicial + incêndio no motor`);
  console.log(`  ${c5} (SW4K2D5) - SW4 Diamond 2020    | Frota corporativa, recall atendido, 5 revisões`);
  console.log(`  ${c6} (MBZ1C80) - C 180 2021           | Único dono, RECALL DE AIRBAG PENDENTE`);
  console.log(`\n>> Atualize CONTRACT_ADDRESS em Front-end/src/config/blockchain.ts`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
