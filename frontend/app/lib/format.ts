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

export const formatDateTime = (seconds: bigint | number) => {
  const n = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (!n) return "-";
  return new Date(n * 1000).toLocaleString();
};

export const formatDuration = (seconds: bigint | number) => {
  const n = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (!n || n < 0) return "0s";
  const d = Math.floor(n / 86400);
  const h = Math.floor((n % 86400) / 3600);
  const m = Math.floor((n % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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
