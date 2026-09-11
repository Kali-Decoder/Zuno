import { ethers } from "ethers";
import { arcTestnet } from "~~/config/chains";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || arcTestnet.rpcUrls.default.http[0];

let cached: ethers.JsonRpcProvider | null = null;

export function getPublicProvider() {
  if (!cached) {
    cached = new ethers.JsonRpcProvider(RPC_URL, arcTestnet.id, { staticNetwork: true });
  }
  return cached;
}

export function getFreshPublicProvider() {
  cached = new ethers.JsonRpcProvider(RPC_URL, arcTestnet.id, { staticNetwork: true });
  return cached;
}

export async function waitForPublicBlock(minBlock: number, timeoutMs = 20_000) {
  const provider = getFreshPublicProvider();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const current = await provider.getBlockNumber();
    if (current >= minBlock) return current;
    await new Promise(r => setTimeout(r, 400));
  }
  return provider.getBlockNumber();
}

export const EXPLORER_URL = arcTestnet.blockExplorers?.default.url ?? "https://testnet.arcscan.app";
export const explorerAddress = (address: string) => `${EXPLORER_URL}/address/${address}`;
export const explorerTx = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;
