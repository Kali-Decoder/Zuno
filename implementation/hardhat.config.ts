import "dotenv/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.ARC_PRIVATE_KEY;
const ACCOUNTS = PRIVATE_KEY
  ? [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`]
  : [configVariable("PRIVATE_KEY")];

const ARC_TESTNET_RPC =
  process.env.ARC_TESTNET_RPC_URL || process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network";

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
          evmVersion: "paris",
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
          metadata: {
            bytecodeHash: "ipfs",
          },
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          evmVersion: "paris",
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
          metadata: {
            bytecodeHash: "ipfs",
          },
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
    /** Arc Testnet — chainId 5042002, native symbol USDC */
    arcTestnet: {
      type: "http",
      chainType: "l1",
      chainId: 5042002,
      url: ARC_TESTNET_RPC,
      accounts: ACCOUNTS,
    },
  },
});
