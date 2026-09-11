import {
  fetchSubgraphChartSeries,
  fetchSubgraphTrades,
  isSubgraphConfigured,
  type ChartTf,
  type PricePoint,
} from "~~/lib/subgraph/client";
import { getIndexedChartSeries, getIndexedTrades } from "~~/lib/tokens/tradeSync";

export type ChartSource = "subgraph" | "mongo" | "none";

/**
 * Chart series priority: The Graph → Mongo candles.
 * (RPC live scan stays in the client as last resort.)
 */
export async function resolveChartSeries(
  tokenAddress: string,
  tf: ChartTf = "1H",
): Promise<{ series: PricePoint[]; source: ChartSource }> {
  if (isSubgraphConfigured()) {
    try {
      const series = await fetchSubgraphChartSeries(tokenAddress, tf);
      if (series.length > 1) return { series, source: "subgraph" };
    } catch {
      /* fall through */
    }
  }

  try {
    const series = await getIndexedChartSeries(tokenAddress, tf);
    if (series.length > 1) return { series, source: "mongo" };
  } catch {
    /* fall through */
  }

  return { series: [], source: "none" };
}

export async function resolveTrades(tokenAddress: string, limit = 40) {
  if (isSubgraphConfigured()) {
    try {
      const trades = await fetchSubgraphTrades(tokenAddress, limit);
      if (trades.length > 0) {
        return {
          source: "subgraph" as const,
          trades: trades.map(t => ({
            id: t.id,
            buy: t.isBuy,
            trader: typeof t.trader === "string" ? t.trader : String(t.trader),
            amountNative: Number(t.amountNative),
            amountToken: Number(t.amountToken),
            priceNative: Number(t.priceNative),
            timestamp: new Date(Number(t.timestamp) * 1000).toISOString(),
            txHash: t.txHash ? String(t.txHash) : t.id.split("-")[0] || "",
            source: t.source,
          })),
        };
      }
    } catch {
      /* fall through */
    }
  }

  try {
    const trades = await getIndexedTrades(tokenAddress, limit);
    if (trades.length > 0) return { source: "mongo" as const, trades };
  } catch {
    /* fall through */
  }

  return { source: "none" as const, trades: [] };
}
