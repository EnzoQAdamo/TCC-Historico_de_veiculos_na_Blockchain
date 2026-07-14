const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("RegistroVeicularModule", (m) => {
  const registroVeicular = m.contract("RegistroVeicular");

  return { registroVeicular };
});
