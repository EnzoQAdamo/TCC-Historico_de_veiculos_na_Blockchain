const { ethers, upgrades } = require("hardhat");

// Deploy UUPS proxy + registrarAtor x7 ≈ 5.000.000 gas, +30% buffer
const GAS_ESTIMADO = 6_500_000n;

async function verificarFundos(admin) {
  const feeData  = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas;
  const custoEstimado = GAS_ESTIMADO * gasPrice;
  const saldo = await ethers.provider.getBalance(admin.address);

  console.log(`Saldo do admin:   ${ethers.formatEther(saldo)} ETH`);
  console.log(`Custo estimado:   ${ethers.formatEther(custoEstimado)} ETH (gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei)\n`);

  if (saldo < custoEstimado) {
    throw new Error(
      `Saldo insuficiente!\n` +
      `  Necessário: ${ethers.formatEther(custoEstimado)} ETH\n` +
      `  Disponível: ${ethers.formatEther(saldo)} ETH\n` +
      `  Use um faucet Sepolia: https://sepoliafaucet.com`
    );
  }
  console.log("✅ Saldo suficiente para o deploy.\n");
}

async function main() {
  const [admin, toyota, honda, ford, vw, mercedes, detran, oficina] = await ethers.getSigners();

  console.log("=== DEPLOY — RegistroVeicular ===\n");
  console.log(`Admin:     ${admin.address}`);
  console.log(`Toyota:    ${toyota.address}`);
  console.log(`Honda:     ${honda.address}`);
  console.log(`Ford:      ${ford.address}`);
  console.log(`VW:        ${vw.address}`);
  console.log(`Mercedes:  ${mercedes.address}`);
  console.log(`DETRAN:    ${detran.address}`);
  console.log(`Oficina:   ${oficina.address}\n`);

  await verificarFundos(admin);

  // Deploy via UUPS Proxy
  console.log("Fazendo deploy do contrato...");
  const RegistroVeicular = await ethers.getContractFactory("RegistroVeicular");
  const contrato = await upgrades.deployProxy(
    RegistroVeicular,
    [admin.address],
    { kind: "uups", initializer: "initialize" }
  );
  await contrato.waitForDeployment();
  const contractAddress = await contrato.getAddress();
  console.log(`\n✅ Contrato deployado em: ${contractAddress}\n`);

  // Registrar atores — admin NÃO é registrado como ator de negócio
  // PapelAtor: 0=MONTADORA, 1=AUTORIDADE(DMV), 2=OFICINA, 3=SEGURADORA, 4=CONCESSIONARIA
  console.log("Registrando atores...");

  await (await contrato.registrarAtor(toyota.address,   "Toyota do Brasil Ltda.",                                          0, "8AF")).wait();
  console.log(`  ✅ Toyota    (8AF): ${toyota.address}`);

  await (await contrato.registrarAtor(honda.address,    "Honda Automóveis do Brasil Ltda.",                                0, "93Y")).wait();
  console.log(`  ✅ Honda     (93Y): ${honda.address}`);

  await (await contrato.registrarAtor(ford.address,     "Ford Motor Company Brasil Ltda.",                                 0, "9BF")).wait();
  console.log(`  ✅ Ford      (9BF): ${ford.address}`);

  await (await contrato.registrarAtor(vw.address,       "Volkswagen do Brasil Indústria de Veículos Motores Ltda.",        0, "9BW")).wait();
  console.log(`  ✅ VW        (9BW): ${vw.address}`);

  await (await contrato.registrarAtor(mercedes.address, "Mercedes-Benz do Brasil Ltda.",                                   0, "9BM")).wait();
  console.log(`  ✅ Mercedes  (9BM): ${mercedes.address}`);

  await (await contrato.registrarAtor(detran.address,   "DETRAN-SP — Departamento Estadual de Trânsito de São Paulo",      1, "")).wait();
  console.log(`  ✅ DETRAN:         ${detran.address}`);

  await (await contrato.registrarAtor(oficina.address,  "Oficina Autorizada Centro Automotivo Paulista",                   2, "")).wait();
  console.log(`  ✅ Oficina:        ${oficina.address}`);

  console.log(`
======================================================
  Endereço do contrato: ${contractAddress}

  Próximos passos:
  1. Adicione no .env:
     CONTRACT_ADDRESS=${contractAddress}

  2. Atualize Front-end/.env.sepolia:
     VITE_CONTRACT_ADDRESS=${contractAddress}

  3. Atualize listener/.env:
     CONTRACT_ADDRESS=${contractAddress}
     DEPLOY_BLOCK=<bloco do deploy — veja no Etherscan>

  4. Distribua ETH entre as contas de role:
     npx hardhat run scripts/rebalance.js --network sepolia

  5. Para popular dados de teste:
     npx hardhat run scripts/seed.js --network sepolia
======================================================
  `);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
