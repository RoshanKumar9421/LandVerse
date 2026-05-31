import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import "dotenv/config";
import { defineConfig } from "hardhat/config";

// Environment variables loaded from .env
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  // Solidity compiler configuration
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },

  // Networks configuration
  networks: {
    // Sepolia Testnet
    sepolia: {
      type: "http",
      url: SEPOLIA_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },

  // Etherscan smart contract verification configuration
  etherscan: {
    apiKey: ETHERSCAN_API_KEY || "",
  },
});