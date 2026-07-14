const { ethers } = require("hardhat");

// Rebalanceia as 8 contas para ~12.5% do total cada.
// Algoritmo: casa quem tem mais excesso com quem tem mais déficit, transfere direto.
// Só executa se o desvio for maior que THRESHOLD (evita gastar mais em gas do que vale).
// Rode a qualquer momento: npx hardhat run scripts/rebalance.js --network sepolia

const NOMES = ["Admin", "Toyota", "Honda", "Ford", "VW", "Mercedes", "DETRAN", "Oficina"];

async function main() {
  const signers = await ethers.getSigners();
  const contas  = signers.slice(0, 8);

  const feeData  = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas;
  const custoTx  = gasPrice * 21000n;

  // Só rebalanceia se o desvio for maior que 5x o custo de uma transferência
  const THRESHOLD = custoTx * 5n;

  console.log("=== REBALANCE — ~12.5% cada ===\n");
  console.log(`Gas price:  ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
  console.log(`Threshold:  ${ethers.formatEther(THRESHOLD)} ETH (mínimo para valer a pena)\n`);

  // Saldos atuais
  const saldos = await Promise.all(contas.map(s => ethers.provider.getBalance(s.address)));
  const total  = saldos.reduce((a, b) => a + b, 0n);
  const target = total / BigInt(contas.length);

  console.log("Saldos atuais:");
  for (let i = 0; i < contas.length; i++) {
    const diff  = saldos[i] - target;
    const sinal = diff >= 0n ? "+" : "-";
    console.log(
      `  ${NOMES[i].padEnd(10)} ${ethers.formatEther(saldos[i]).padStart(12)} ETH` +
      `  (${sinal}${ethers.formatEther(diff < 0n ? -diff : diff)} ETH)`
    );
  }
  console.log(`  ${"Total".padEnd(10)} ${ethers.formatEther(total).padStart(12)} ETH`);
  console.log(`  ${"Target 12.5%".padEnd(10)} ${ethers.formatEther(target).padStart(12)} ETH\n`);

  // Monta lista de desvios — positivo = excesso, negativo = déficit
  const desvios = contas.map((signer, i) => ({
    signer,
    nome: NOMES[i],
    desvio: saldos[i] - target,
  }));

  // Verifica se alguma conta está desviada o suficiente
  const precisaRebalancear = desvios.some(d => d.desvio > THRESHOLD || d.desvio < -THRESHOLD);
  if (!precisaRebalancear) {
    console.log("✅ Contas já estão balanceadas — nenhuma transferência necessária.");
    return;
  }

  // Algoritmo guloso: casa maior excesso com maior déficit, transfere direto.
  // Com 8 contas, o máximo teórico é 7 transferências (n-1). Limite de 14 por segurança.
  const MAX_ITER = 14;
  let transferencias = 0;
  while (transferencias < MAX_ITER) {
    // Ordena: maior excesso primeiro, maior déficit último
    desvios.sort((a, b) => (b.desvio > a.desvio ? 1 : -1));

    const origem  = desvios[0];
    const destino = desvios[desvios.length - 1];

    // Para quando o maior excesso e o maior déficit estiverem dentro do threshold
    if (origem.desvio <= THRESHOLD || destino.desvio >= -THRESHOLD) break;

    // Envia o mínimo entre o excesso de origem e o déficit de destino (menos custo do gas)
    const enviar = origem.desvio < -destino.desvio
      ? origem.desvio - custoTx
      : -destino.desvio - custoTx;

    if (enviar <= 0n) break;

    const tx = await origem.signer.sendTransaction({ to: destino.signer.address, value: enviar });
    await tx.wait();
    console.log(`  ✅ ${ethers.formatEther(enviar)} ETH: ${origem.nome} → ${destino.nome}`);
    transferencias++;

    // Atualiza desvios com saldos reais após a transferência
    origem.desvio  = await ethers.provider.getBalance(origem.signer.address) - target;
    destino.desvio = await ethers.provider.getBalance(destino.signer.address) - target;
  }

  if (transferencias === MAX_ITER) {
    console.log(`\n⚠️  Limite de ${MAX_ITER} transferências atingido. Contas podem não estar perfeitamente balanceadas — verifique os saldos finais.`);
  }

  if (transferencias === 0) {
    console.log("✅ Nenhuma transferência necessária.");
    return;
  }

  // Saldos finais
  console.log("\nSaldos finais:");
  for (let i = 0; i < contas.length; i++) {
    const saldoFinal = await ethers.provider.getBalance(contas[i].address);
    console.log(`  ${NOMES[i].padEnd(10)} ${ethers.formatEther(saldoFinal).padStart(12)} ETH`);
  }
  console.log(`\n✅ Rebalanceamento concluído em ${transferencias} transferência(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
