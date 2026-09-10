import "dotenv/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.MONAD_PRIVATE_KEY;
const ACCOUNTS = PRIVATE_KEY
  ? [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`]
  : [configVariable("MONAD_PRIVATE_KEY")];

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    monadTestnet: {
      type: "http",
      chainType: "l1",
      chainId: 10143,
      url: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
      accounts: ACCOUNTS,
    },
    monadMainnet: {
      type: "http",
      chainType: "l1",
      chainId: 143,
      url: process.env.MONAD_MAINNET_RPC_URL || "https://rpc.monad.xyz",
      accounts: ACCOUNTS,
    },
  },
});
