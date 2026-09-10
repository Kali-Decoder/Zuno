import { MOCK_ADDRESS } from "./constants";

export async function readContract(_config: unknown, _params?: unknown) {
  return false;
}

export async function writeContract(_config: unknown, _params?: unknown) {
  return "0xmocktxhash" as `0x${string}`;
}

export function getPublicClient(_config?: unknown) {
  return {
    getBlockNumber: async () => 1n,
    waitForTransactionReceipt: async () => ({
      status: "success",
      transactionHash: "0xmocktxhash",
      blockNumber: 1n,
    }),
    readContract: async () => 0n,
  };
}

export const mockAccount = MOCK_ADDRESS;
