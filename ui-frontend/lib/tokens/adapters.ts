import type { ExploreToken } from "~~/constants/exploreTokens";
import type { GraduatedToken } from "~~/constants/graduatedTokens";
import type { TokenDetail } from "~~/constants/tokenDetail";
import type { ApiToken } from "~~/hooks/useApiTokens";
import type { TokenMarketStats } from "~~/lib/reflow/actions";
import { formatCompactUsd } from "~~/lib/reflow/format";
import type { CultToken } from "~~/types/types";

const EXPLORER = "https://testnet.monadvision.com";

function asAddr(value?: string): `0x${string}` {
  const v = (value || "0x0000000000000000000000000000000000000000").toLowerCase();
  return (v.startsWith("0x") ? v : `0x${v}`) as `0x${string}`;
}

function formatUsd(n?: number) {
  return formatCompactUsd(n);
}

function timeAgo(iso?: string) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function explorerAddressUrl(address: string) {
  return `${EXPLORER}/address/${address}`;
}

export function applyMarketStatsToDetail(detail: TokenDetail, stats: TokenMarketStats): TokenDetail {
  return {
    ...detail,
    marketCapLabel: stats.marketCapLabel,
    marketCapUsd: stats.marketCapUsd,
    marketCapNative: stats.marketCapNative,
    liquidityLabel: stats.liquidityLabel,
    liquidityNative: stats.liquidityNative,
    volume24hLabel: stats.volumeLabel,
    volumeNative: stats.volumeNative,
    txCount: stats.txCountInWindow,
    priceLabel: stats.priceLabel,
    priceNative: stats.priceNative,
    progress: stats.progress || detail.progress,
    graduated: stats.listed || detail.graduated,
    curve: stats.curve || detail.curve,
    pair: stats.pair || detail.pair,
    reserveNativeLabel: stats.liquidityNative > 0 ? stats.liquidityLabel : detail.reserveNativeLabel,
    athLabel: detail.athLabel === "$—" && stats.marketCapUsd > 0 ? stats.marketCapLabel : detail.athLabel,
    socials: {
      ...detail.socials,
      contract: explorerAddressUrl(detail.id),
      curve: stats.curve ? explorerAddressUrl(stats.curve) : detail.socials.curve,
      pool: stats.pair ? explorerAddressUrl(stats.pair) : detail.socials.pool,
    },
  };
}

export function apiToExploreToken(t: ApiToken): ExploreToken {
  const created = t.createdAt ? new Date(t.createdAt).getTime() : Date.now();
  const lastBuy = t.lastBuyAt ? new Date(t.lastBuyAt).getTime() : created;
  const phase = t.phase || (t.graduated ? "listed" : "bonding");
  let badge: ExploreToken["badge"] = "V2";
  if (phase === "locked") badge = "warn";
  if (phase === "inactive" || phase === "voting") badge = "warn";
  if (t.graduated) badge = "OG";

  return {
    id: asAddr(t.address),
    name: t.name,
    symbol: t.symbol,
    imageUrl: t.imageUrl || "/gmonad.jpeg",
    marketCapLabel: formatUsd(t.marketCapUsd),
    progress: Math.min(100, Math.max(0, t.progress ?? 0)),
    timeAgo: timeAgo(t.createdAt),
    badge,
    volume: t.volumeUsd ?? 0,
    createdAt: created,
    lastBuyAt: lastBuy,
  };
}

export function apiToGraduatedToken(t: ApiToken): GraduatedToken {
  return {
    id: asAddr(t.address),
    name: t.name,
    symbol: t.symbol,
    imageUrl: t.imageUrl || "/gmonad.jpeg",
    marketCapLabel: formatUsd(t.marketCapUsd),
    timeAgo: timeAgo(t.createdAt),
    showV2: true,
  };
}

export function apiToCultToken(t: ApiToken): CultToken {
  return {
    id: asAddr(t.address),
    name: t.name,
    symbol: t.symbol,
    tokenCreator: t.creator || "",
    airdropContract: "",
    poolAddress: t.pair || "",
    isGraduated: Boolean(t.graduated || t.isListing),
    isWatchlisted: false,
    marketCap: t.marketCapUsd ?? 0,
    blockTimestamp: t.createdAt || new Date().toISOString(),
    imageUrl: t.imageUrl || "/gmonad.jpeg",
    description: t.description || "",
    bondingCurvePercentage: t.progress,
    volume: t.volumeUsd,
  };
}

export function apiToTokenDetail(t: ApiToken): TokenDetail {
  const graduated = Boolean(t.graduated || t.isListing);
  const addr = asAddr(t.address);
  return {
    id: addr,
    name: t.name,
    symbol: t.symbol,
    imageUrl: t.imageUrl || "/gmonad.jpeg",
    description: t.description || "Reflow bonding-curve token on Monad Testnet.",
    marketCapLabel: formatUsd(t.marketCapUsd),
    liquidityLabel: graduated ? "DEX" : "Bonding",
    volume24hLabel: formatUsd(t.volumeUsd),
    athLabel: formatUsd(t.marketCapUsd),
    change1h: 0,
    burnedLabel: "—",
    burnedUsd: "—",
    burnedPct: "—",
    progress: t.progress,
    timeAgo: timeAgo(t.createdAt),
    graduated,
    curve: t.curve,
    pair: t.pair,
    phase: t.phase,
    curveLocked: t.curveLocked,
    inactive: t.inactive,
    recyclingEligible: t.recyclingEligible,
    vaultStatus: t.vaultStatus,
    proposal: t.proposal,
    creator: t.creator,
    marketCapUsd: t.marketCapUsd,
    socials: {
      contract: explorerAddressUrl(addr),
      curve: t.curve ? explorerAddressUrl(t.curve) : undefined,
      pool: t.pair ? explorerAddressUrl(t.pair) : undefined,
    },
  };
}

export async function persistTokenPatch(body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Trigger full chain → Mongo sync (Create, vault, governor, progress). */
export async function triggerChainSync(): Promise<boolean> {
  try {
    const res = await fetch("/api/tokens/sync", { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export function lifecyclePersistBody(
  tokenAddress: string,
  tokenName: string,
  tokenSymbol: string,
  life: {
    curve: string;
    pair: string;
    listed: boolean;
    locked: boolean;
    progress: number;
    vaultStatus: string;
    inactive: boolean;
    recyclingEligible: boolean;
    proposalId: number | null;
    proposalState: string | null;
    proposalCandidates: string[];
    proposalEndTime: number | null;
    proposalWinner: string;
    targetToken?: string;
    reserveToken?: string;
    reserveNative?: string;
  },
  phase: string,
  extras?: Record<string, unknown>,
) {
  return {
    address: tokenAddress,
    name: tokenName,
    symbol: tokenSymbol,
    curve: life.curve,
    pair: life.pair,
    graduated: life.listed,
    isListing: life.listed,
    curveLocked: life.locked,
    progress: life.progress,
    phase,
    vaultStatus: life.vaultStatus,
    inactive: life.inactive,
    recyclingEligible: life.recyclingEligible,
    targetToken: life.targetToken,
    reserveToken: life.reserveToken,
    reserveNative: life.reserveNative,
    listedAt: life.listed ? new Date().toISOString() : undefined,
    proposal: life.proposalId
      ? {
          id: life.proposalId,
          state: life.proposalState,
          candidates: life.proposalCandidates,
          endTime: life.proposalEndTime ? new Date(life.proposalEndTime * 1000).toISOString() : undefined,
          winner: life.proposalWinner,
          executed: life.proposalState === "Executed",
          deadToken: tokenAddress,
        }
      : null,
    lifecycleSyncedAt: new Date().toISOString(),
    ...extras,
  };
}
