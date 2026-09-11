import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import BigNumber from "bignumber.js";
import { type ClassValue, clsx } from "clsx";
import { formatDistanceToNowStrict } from "date-fns";
import { BigNumberish, formatEther } from "ethers";
import { twMerge } from "tailwind-merge";
import { ETH_PRICE_USD } from "~~/constants/mockData";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStorageValue<T>(key: string, defaultValue: T): T {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(key);
    const initial = saved !== null ? JSON.parse(saved) : defaultValue;
    return initial || defaultValue;
  }
  return defaultValue;
}

export function shortTimeAgo(timestamp: string | number | Date, short = false): string {
  if (!short) {
    return formatDistanceToNowStrict(new Date(timestamp), { addSuffix: false });
  }

  const full = formatDistanceToNowStrict(new Date(timestamp), { addSuffix: false });
  const map: Record<string, string> = {
    seconds: "s",
    second: "s",
    minutes: "m",
    minute: "m",
    hours: "h",
    hour: "h",
    days: "d",
    day: "d",
    weeks: "w",
    week: "w",
    months: "mo",
    month: "mo",
    years: "y",
    year: "y",
  };

  const [num, unit] = full.split(" ");
  return `${num}${map[unit] || unit}`;
}

function snakeToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  } else if (obj !== null && typeof obj === "object") {
    return Object.entries(obj).reduce(
      (acc, [key, value]) => {
        const camelKey = key.replace(/_([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
        acc[camelKey] = snakeToCamel(value);
        return acc;
      },
      {} as Record<string, any>,
    );
  }
  return obj;
}

export const checkLocked = async function ({
  logout,
  router,
  user,
}: {
  logout: () => Promise<void>;
  router: AppRouterInstance;
  user: { wallet?: { address?: string } } | null;
}) {
  if (typeof window === "undefined") return;
  const ethereum = (window as Window & { ethereum?: { request: (args: { method: string }) => Promise<string[]> } })
    .ethereum;
  if (!ethereum) return;

  const accounts = await ethereum.request({ method: "eth_accounts" });
  if ((!accounts || accounts.length === 0) && user) {
    await logout();
    router.replace("/auth");
  }
};

export function base64ToFile(base64: string, filename: string, mimeType: string): File {
  const byteString = atob(base64.split(",")[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new File([ab], filename, { type: mimeType });
}

export function validateTokenAddress(tokenAddress: string): asserts tokenAddress is `0x${string}` {
  const addressPattern = /^0x[0-9a-fA-F]{40}$/;
  if (!addressPattern.test(tokenAddress)) {
    throw new TypeError(`Invalid token address: ${tokenAddress}`);
  }
}

const ellipsisToken = (token: string) => {
  if (token.length > 10) {
    return `${token.slice(0, 4)}...${token.slice(-3)}`;
  }
  return token;
};

function ellipsisTransaction(value: string): string {
  if (value.length <= 10) {
    return value;
  }
  const start = value.slice(0, 4);
  const end = value.slice(-4); // Increase to 4 for better visibility

  return `${start}...${end}`;
}
function EllipsisTransaction({ value }: { value: string }) {
  const shortValue = ellipsisTransaction(value);

  return (
    <a href={`https://testnet.monadexplorer.com/tx/${value}`} target="_blank" rel="noreferrer">
      {shortValue}
    </a>
  );
}

// ——————————————————————————————————————————
// Helpers for stripping zeros & adding K/M/B
// ——————————————————————————————————————————
function stripZeros(s: string): string {
  return s.replace(/\.?0+$/, "");
}

function addSuffix(value: number, largeDecimals = 2, smallDecimals = 4): string {
  const suffixes = [
    { value: 1_000_000_000, symbol: "B" },
    { value: 1_000_000, symbol: "M" },
    { value: 1_000, symbol: "K" },
  ];
  for (const { value: threshold, symbol } of suffixes) {
    if (value >= threshold) {
      const raw = (value / threshold).toFixed(largeDecimals);
      return stripZeros(raw) + symbol;
    }
  }
  const raw = value.toFixed(smallDecimals);
  return stripZeros(raw);
}

// ——————————————————————————————————————————
// Normalize any input → BigNumberish without decimals
// ——————————————————————————————————————————
function normalizeWei(wei: BigNumberish): BigNumberish {
  if (BigNumber.isBigNumber(wei)) {
    // BigNumber → safe
    return wei;
  }
  if (typeof wei === "bigint") {
    // bigint → safe
    return wei;
  }
  if (typeof wei === "string") {
    // Strip any fractional part: "1234.0000" → "1234"
    const [intPart] = wei.split(".");
    return intPart;
  }
  // number → truncate decimals if any, then to string
  return String(Math.trunc(wei));
}

// ——————————————————————————————————————————
// formatWeiValues: Wei → ETH string with K/M/B
// ——————————————————————————————————————————
function formatWeiValues(wei: BigNumberish): string {
  // 1) normalize any input to integer BigNumberish
  const clean = normalizeWei(wei);
  // 2) formatUnits(clean, 18) returns the ETH value as a string
  const ethNum = parseFloat(formatEther(clean));
  // 3) hand off to your suffixer
  return addSuffix(ethNum, /*large=*/ 2, /*small=*/ 4);
}

// ——————————————————————————————————————————
// formatVolume: Wei → USD string (with K/M/B) or 0
// ——————————————————————————————————————————
function formatVolume(wei: BigNumberish): string | number {
  const clean = normalizeWei(wei);
  const ethValue = parseFloat(formatEther(clean));
  const usdValue = ethValue * ETH_PRICE_USD;
  // treat tiny volumes as zero
  if (usdValue < 0.005) {
    return 0;
  }
  return addSuffix(usdValue, 2, 4);
}
function formatLargeNumber(num: number | bigint | string, decimalsForSmall = 2): string {
  const suffixes = [
    { value: 1_000_000_000n, symbol: "B" }, // Billion
    { value: 1_000_000n, symbol: "M" }, // Million
    { value: 1_000n, symbol: "K" }, // Thousand
  ];

  // Convert string input to Number or BigInt
  if (typeof num === "string") {
    if (num.includes(".")) {
      num = parseFloat(num); // Convert decimal strings to number
    } else {
      num = BigInt(num); // Convert whole number strings to BigInt
    }
  }

  // Handle number case (supports decimals)
  if (typeof num === "number") {
    // Handle numbers less than 1
    if (num < 1 && num > 0) {
      return num.toFixed(decimalsForSmall);
    }

    if (num < 1_000) return num.toString();

    for (const { value, symbol } of suffixes) {
      if (num >= Number(value)) {
        return (num / Number(value)).toFixed(1).replace(/\.0$/, "") + symbol;
      }
    }
    return num.toString();
  }

  // Handle BigInt case (no decimals allowed)
  if (typeof num === "bigint") {
    if (num < 1000n) return num.toString();
    for (const { value, symbol } of suffixes) {
      if (num >= value) {
        const result = num / value;
        return result.toString() + symbol; // No decimals for BigInt
      }
    }
    return num.toString();
  }

  return "Invalid input";
}

export {
  ellipsisToken,
  ellipsisTransaction,
  formatLargeNumber,
  EllipsisTransaction,
  snakeToCamel,
  formatWeiValues,
  formatVolume,
  addSuffix,
};
