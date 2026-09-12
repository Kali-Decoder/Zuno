import { ethers } from "ethers";
import { txError } from "~~/lib/reflow/format";
import { getFreshPublicProvider, waitForPublicBlock } from "~~/lib/reflow/provider";

const FALLBACK_GAS: Record<string, bigint> = {
  createCurve: 4_000_000n,
  buy: 1_500_000n,
  exactOutBuy: 1_500_000n,
  sell: 1_500_000n,
  listing: 6_000_000n,
  markInactive: 400_000n,
  propose: 500_000n,
  vote: 300_000n,
  execute: 2_000_000n,
  approve: 100_000n,
};

export async function sendContractTx(
  signer: ethers.Signer,
  address: string,
  abi: readonly string[],
  method: string,
  args: unknown[],
  overrides: { value?: bigint } = {},
) {
  const from = await signer.getAddress();
  const provider = getFreshPublicProvider();

  // Pre-flight check: ensure wallet has enough native balance (USDC on Arc)
  if (overrides.value != null && overrides.value > 0n) {
    const balance = await provider.getBalance(from);
    if (balance < overrides.value) {
      const balStr = Number(ethers.formatEther(balance)).toFixed(4);
      const reqStr = Number(ethers.formatEther(overrides.value)).toFixed(4);
      throw new Error(`Insufficient USDC balance. You have ${balStr} USDC, but this ${method} requires ${reqStr} USDC.`);
    }
  }

  const reader = new ethers.Contract(address, abi, provider);
  const writer = new ethers.Contract(address, abi, signer);
  const fn = reader.getFunction(method);
  const callOverrides = { ...overrides, from };

  try {
    await fn.staticCall(...args, callOverrides);
  } catch (error) {
    throw new Error(decodeCallError(error, method));
  }

  const fallback = FALLBACK_GAS[method] ?? 1_500_000n;
  let gasLimit = fallback;
  try {
    const estimated = await fn.estimateGas(...args, callOverrides);
    const buffered = estimated + estimated / 5n;
    gasLimit = buffered > fallback ? buffered : fallback;
  } catch {
    // Some wallet RPCs fail estimateGas even when the call is valid.
  }

  const tx = await writer.getFunction(method)(...args, { ...overrides, gasLimit });
  const receipt = await tx.wait();
  if (receipt?.blockNumber) {
    await waitForPublicBlock(receipt.blockNumber);
  }
  return receipt;
}

export function decodeCallError(error: unknown, method = "transaction") {
  const err = error as { code?: string; shortMessage?: string; message?: string };
  const blob = `${err.shortMessage || ""} ${err.message || ""}`.toLowerCase();
  if (err.code === "ACTION_REJECTED" || blob.includes("user rejected") || blob.includes("user denied")) {
    return "Transaction cancelled.";
  }
  const raw = txError(error);
  if (raw.toLowerCase().includes("missing revert data")) {
    return `${method} failed: check your USDC balance on Arc Testnet, or ensure you are trading a newly launched token.`;
  }
  return raw;
}
