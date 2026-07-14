require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

const zero = "0x" + "0".repeat(64);
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || zero;
const TOYOTA_KEY   = process.env.TOYOTA_PRIVATE_KEY   || zero;
const HONDA_KEY    = process.env.HONDA_PRIVATE_KEY    || zero;
const FORD_KEY     = process.env.FORD_PRIVATE_KEY     || zero;
const VW_KEY       = process.env.VW_PRIVATE_KEY       || zero;
const MB_KEY       = process.env.MB_PRIVATE_KEY       || zero;
const DETRAN_KEY   = process.env.DETRAN_PRIVATE_KEY   || zero;
const OFICINA_KEY  = process.env.OFICINA_PRIVATE_KEY  || zero;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Ethereum Sepolia testnet
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: [DEPLOYER_KEY, TOYOTA_KEY, HONDA_KEY, FORD_KEY, VW_KEY, MB_KEY, DETRAN_KEY, OFICINA_KEY],
      chainId: 11155111,
    },
    // Polygon Mainnet
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: [DEPLOYER_KEY],
      chainId: 137,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
};
