const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

async function main() {
  const proxyAddress = process.env.CONTRACT_ADDRESS;
  if (!proxyAddress) throw new Error("CONTRACT_ADDRESS não definido no .env");

  console.log(`Fazendo upgrade do proxy em ${proxyAddress}...`);

  const RegistroVeicular = await ethers.getContractFactory("RegistroVeicular");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, RegistroVeicular);
  await upgraded.waitForDeployment();

  console.log(`✅ Upgrade concluído. Endereço do proxy: ${await upgraded.getAddress()}`);
  console.log("O endereço do contrato não mudou — nenhuma atualização de .env necessária.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
