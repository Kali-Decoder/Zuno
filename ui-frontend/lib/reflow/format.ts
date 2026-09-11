import { ethers } from "ethers";

export const ZERO = BigInt(0);
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const shortAddress = (value: string) => {
  if (!value) return "-";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

export const isAddress = (value: string) => ethers.isAddress(value);

export const isSetAddress = (value?: string | null) =>
  !!value && ethers.isAddress(value) && value.toLowerCase() !== ZERO_ADDRESS;

export const formatToken = (value: bigint, decimals = 18, digits = 4) => {
  try {
    const parsed = Number(ethers.formatUnits(value, decimals));
    if (!Number.isFinite(parsed)) return "0";
    return parsed.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
  } catch {
    return "0";
  }
};

/** MON → USD multiplier (testnet default 1). Override with NEXT_PUBLIC_MON_USD. */
export const monUsdPrice = () => {
  const n = Number(process.env.NEXT_PUBLIC_MON_USD || "1");
  return Number.isFinite(n) && n > 0 ? n : 1;
};

export const formatCompactUsd = (n?: number) => {
  if (n == null || !Number.isFinite(n) || n <= 0) return "$—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}k`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toExponential(2)}`;
};

export const formatCompactMon = (n?: number) => {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M MON`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}k MON`;
  if (n >= 1) return `${n.toFixed(2)} MON`;
  if (n >= 0.0001) return `${n.toFixed(4)} MON`;
  return `${n.toExponential(2)} MON`;
};

export const formatTokenPrice = (monPerToken?: number) => {
  if (monPerToken == null || !Number.isFinite(monPerToken) || monPerToken <= 0) return "—";
  if (monPerToken >= 1) return `${monPerToken.toFixed(4)} MON`;
  if (monPerToken >= 0.0001) return `${monPerToken.toFixed(6)} MON`;
  // Prefer fixed decimals over scientific for UI polish
  const fixed = monPerToken.toFixed(12).replace(/\.?0+$/, "");
  return `${fixed} MON`;
};

export const txError = (error: unknown) => {
  if (!error || typeof error !== "object") return "Transaction failed.";
  const e = error as {
    shortMessage?: string;
    reason?: string;
    message?: string;
    info?: { error?: { message?: string } };
  };
  return e.shortMessage || e.reason || e.info?.error?.message || e.message || "Transaction failed.";
};

export const deadline = (seconds = 600) => BigInt(Math.floor(Date.now() / 1000) + seconds);

export const calcFee = (amount: bigint, denominator: bigint, numerator: bigint) => {
  if (amount <= ZERO || numerator === ZERO) return ZERO;
  return (amount * denominator) / numerator;
};
