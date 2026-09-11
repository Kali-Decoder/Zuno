/**
 * ZUNO subgraph client.
 * Prefers NEXT_PUBLIC_SUBGRAPH_URL (browser) or SUBGRAPH_URL (server).
 */

export type SubgraphToken = {
  id: string;
  name: string;
  symbol: string;
  creator?: string | null;
  curve?: string | null;
  pair?: string | null;
  tokenURI?: string | null;
  createdAt: string;
  createdBlock?: string;
  graduated: boolean;
  listedAt?: string | null;
  tradeCount: string;
  volumeNative: string;
  lastPriceNative: string;
  lastTradeAt: string | null;
};

export type SubgraphTrade = {
  id: string;
  isBuy: boolean;
  priceNative: string;
  amountNative: string;
  amountToken: string;
  timestamp: string;
  trader: string;
  source: string;
  txHash?: string;
};

export type SubgraphCandle = {
  id: string;
  openTime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volumeNative: string;
  tradeCount: string;
};

export type ChartTf = "5M" | "1H" | "6H" | "1D" | "ALL";

export type PricePoint = { t: number; v: number };

const TF_SECONDS: Record<ChartTf, number> = {
  "5M": 5 * 60,
  "1H": 60 * 60,
  "6H": 6 * 60 * 60,
  "1D": 24 * 60 * 60,
  ALL: 90 * 24 * 60 * 60,
};

export function getSubgraphUrl() {
  return (
    process.env.NEXT_PUBLIC_SUBGRAPH_URL ||
    process.env.SUBGRAPH_URL ||
    ""
  ).trim();
}

export function isSubgraphConfigured() {
  return getSubgraphUrl().length > 0;
}

export async function querySubgraph<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T | null> {
  const url = getSubgraphUrl();
  if (!url) return null;

  try {
    const init: RequestInit = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
    };
    // Next.js ISR hint only on server
    if (typeof window === "undefined") {
      (init as RequestInit & { next?: { revalidate: number } }).next = { revalidate: 15 };
    }

    const res = await fetch(url, init);
    if (!res.ok) {
      console.warn("[subgraph] HTTP", res.status);
      return null;
    }
    const json = await res.json();
    if (json.errors?.length) {
      console.warn("[subgraph]", json.errors[0]?.message);
      return null;
    }
    return json.data as T;
  } catch (e) {
    console.warn("[subgraph] fetch failed", e);
    return null;
  }
}

export async function fetchSubgraphMeta() {
  return querySubgraph<{
    _meta: { block: { number: number }; deployment: string; hasIndexingErrors: boolean };
  }>(`{ _meta { block { number } deployment hasIndexingErrors } }`);
}

export async function fetchSubgraphTokens(options?: {
  graduated?: boolean;
  first?: number;
}): Promise<SubgraphToken[]> {
  const first = options?.first ?? 100;
  const where =
    options?.graduated === undefined
      ? ""
      : `, where: { graduated: ${options.graduated ? "true" : "false"} }`;

  const data = await querySubgraph<{ tokens: SubgraphToken[] }>(
    `{
      tokens(first: ${first}, orderBy: createdAt, orderDirection: desc${where}) {
        id name symbol creator curve pair tokenURI
        createdAt createdBlock graduated listedAt
        tradeCount volumeNative lastPriceNative lastTradeAt
      }
    }`,
  );
  return data?.tokens ?? [];
}

export async function fetchSubgraphToken(address: string): Promise<SubgraphToken | null> {
  const data = await querySubgraph<{ token: SubgraphToken | null }>(
    `query Token($id: ID!) {
      token(id: $id) {
        id name symbol creator curve pair tokenURI
        createdAt createdBlock graduated listedAt
        tradeCount volumeNative lastPriceNative lastTradeAt
      }
    }`,
    { id: address.toLowerCase() },
  );
  return data?.token ?? null;
}

export async function fetchSubgraphTrades(token: string, first = 40): Promise<SubgraphTrade[]> {
  const data = await querySubgraph<{ trades: SubgraphTrade[] }>(
    `query Trades($token: String!, $first: Int!) {
      trades(
        first: $first
        orderBy: timestamp
        orderDirection: desc
        where: { token: $token }
      ) {
        id isBuy priceNative amountNative amountToken timestamp trader source txHash
      }
    }`,
    { token: token.toLowerCase(), first },
  );
  return data?.trades ?? [];
}

export async function fetchSubgraphCandles(
  token: string,
  options?: { first?: number; sinceUnix?: number },
): Promise<SubgraphCandle[]> {
  const first = options?.first ?? 500;
  const since = options?.sinceUnix;
  const where = since
    ? `{ token: $token, openTime_gte: $since }`
    : `{ token: $token }`;

  // The Graph pluralizes Candle1m → candle1Ms (capital M)
  const data = await querySubgraph<{ candle1Ms: SubgraphCandle[] }>(
    `query Candles($token: String!, $first: Int!${since ? ", $since: BigInt!" : ""}) {
      candle1Ms(
        first: $first
        orderBy: openTime
        orderDirection: asc
        where: ${where}
      ) {
        id openTime open high low close volumeNative tradeCount
      }
    }`,
    {
      token: token.toLowerCase(),
      first,
      ...(since ? { since: String(since) } : {}),
    },
  );
  return data?.candle1Ms ?? [];
}

/** Convert subgraph 1m candles into a UI price series for a timeframe. */
export async function fetchSubgraphChartSeries(
  token: string,
  tf: ChartTf = "1H",
): Promise<PricePoint[]> {
  const sinceUnix = tf === "ALL" ? undefined : Math.floor(Date.now() / 1000) - TF_SECONDS[tf];
  const candles = await fetchSubgraphCandles(token, { first: 500, sinceUnix });
  const series = candles
    .map(c => ({
      t: Number(c.openTime) * 1000,
      v: Number(c.close),
    }))
    .filter(p => Number.isFinite(p.t) && Number.isFinite(p.v) && p.v > 0);

  // Fallback: derive sparse series from recent trades if candles empty
  if (series.length < 2) {
    const trades = await fetchSubgraphTrades(token, 100);
    return trades
      .map(t => ({
        t: Number(t.timestamp) * 1000,
        v: Number(t.priceNative),
      }))
      .filter(p => Number.isFinite(p.t) && Number.isFinite(p.v) && p.v > 0)
      .reverse();
  }

  return series;
}

/** Default token total supply on Arc (1e27 wei = 1e9 tokens @ 18 decimals). */
const DEFAULT_SUPPLY_TOKENS = 1_000_000_000;

function asHexAddress(value?: string | null): string | undefined {
  if (!value) return undefined;
  const s = String(value).toLowerCase();
  return s.startsWith("0x") ? s : `0x${s}`;
}

function resolveImageUrl(tokenURI?: string | null): string {
  const uri = (tokenURI || "").trim();
  if (!uri) return "/zuno-logo.png";
  if (uri.startsWith("/") || uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("data:")) {
    return uri;
  }
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}`;
  }
  return uri;
}

function usdcUsd(): number {
  const n = Number(process.env.NEXT_PUBLIC_USDC_USD || process.env.NEXT_PUBLIC_MON_USD || "1");
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Map subgraph token → ApiToken-shaped object for list UIs. */
export function subgraphTokenToApi(t: SubgraphToken) {
  const price = Number(t.lastPriceNative);
  const volumeNative = Number(t.volumeNative);
  const marketCapUsd =
    Number.isFinite(price) && price > 0 ? price * DEFAULT_SUPPLY_TOKENS * usdcUsd() : undefined;
  // Native asset on Arc is USDC ≈ USD
  const volumeUsd = Number.isFinite(volumeNative) ? volumeNative * usdcUsd() : 0;

  return {
    address: t.id,
    name: t.name,
    symbol: t.symbol,
    curve: asHexAddress(t.curve),
    pair: asHexAddress(t.pair),
    creator: asHexAddress(t.creator),
    tokenURI: t.tokenURI || undefined,
    imageUrl: resolveImageUrl(t.tokenURI),
    graduated: t.graduated,
    isListing: t.graduated,
    curveLocked: t.graduated,
    progress: t.graduated ? 100 : undefined,
    phase: t.graduated ? "listed" : "bonding",
    vaultStatus: t.graduated ? "Locked" : "None",
    inactive: false,
    recyclingEligible: false,
    volumeUsd,
    marketCapUsd,
    createdAt: t.createdAt ? new Date(Number(t.createdAt) * 1000).toISOString() : undefined,
    listedAt: t.listedAt ? new Date(Number(t.listedAt) * 1000).toISOString() : undefined,
    lastBuyAt: t.lastTradeAt ? new Date(Number(t.lastTradeAt) * 1000).toISOString() : undefined,
    priceNative: Number.isFinite(price) ? price : undefined,
  };
}
