import { ethers } from "ethers";
import { CURVE_ABI, PAIR_ABI } from "~~/config/reflow";
import { connectMongo } from "~~/lib/db/mongodb";
import { getFreshPublicProvider } from "~~/lib/reflow/provider";
import { isSetAddress } from "~~/lib/reflow/format";
import { CandleModel, type CandleInterval } from "~~/models/Candle";
import { TradeModel } from "~~/models/Trade";
import { TokenModel } from "~~/models/Token";

function lower(addr: string) {
  return addr.toLowerCase();
}

const INTERVAL_MS: Record<CandleInterval, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "1h": 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

function bucketStart(tsMs: number, interval: CandleInterval) {
  const size = INTERVAL_MS[interval];
  return Math.floor(tsMs / size) * size;
}

async function upsertCandles(params: {
  token: string;
  timestampMs: number;
  price: number;
  volumeNative: number;
}) {
  const intervals: CandleInterval[] = ["1m", "5m", "1h", "1d"];
  for (const interval of intervals) {
    const openMs = bucketStart(params.timestampMs, interval);
    const id = `${params.token}-${interval}-${openMs}`;
    await CandleModel.updateOne(
      { id },
      {
        $setOnInsert: {
          id,
          token: params.token,
          interval,
          openTime: new Date(openMs),
          open: params.price,
        },
        $set: { close: params.price },
        $max: { high: params.price },
        $min: { low: params.price },
        $inc: { volumeNative: params.volumeNative, tradeCount: 1 },
      },
      { upsert: true },
    );
  }
}

type IndexedTrade = {
  id: string;
  token: string;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  timestamp: Date;
  trader: string;
  isBuy: boolean;
  amountNative: number;
  amountToken: number;
  priceNative: number;
  source: "curve" | "dex";
};

async function persistTrades(trades: IndexedTrade[]) {
  let inserted = 0;
  for (const t of trades) {
    const res = await TradeModel.updateOne(
      { id: t.id },
      { $setOnInsert: t },
      { upsert: true },
    );
    if (res.upsertedCount) {
      inserted += 1;
      await upsertCandles({
        token: t.token,
        timestampMs: t.timestamp.getTime(),
        price: t.priceNative,
        volumeNative: t.amountNative,
      });
    }
  }
  return inserted;
}

async function indexCurveTrades(
  curve: string,
  token: string,
  fromBlock: number,
  toBlock: number,
  provider: ethers.Provider,
) {
  const curveC = new ethers.Contract(curve, CURVE_ABI, provider);
  const trades: IndexedTrade[] = [];
  const blockTs = new Map<number, number>();

  const resolveTs = async (bn: number) => {
    if (blockTs.has(bn)) return blockTs.get(bn)!;
    try {
      const b = await provider.getBlock(bn);
      const ms = b?.timestamp ? Number(b.timestamp) * 1000 : Date.now();
      blockTs.set(bn, ms);
      return ms;
    } catch {
      return Date.now();
    }
  };

  const [buys, sells] = await Promise.all([
    curveC.queryFilter(curveC.filters.Buy(), fromBlock, toBlock),
    curveC.queryFilter(curveC.filters.Sell(), fromBlock, toBlock),
  ]);

  for (const ev of buys) {
    const parsed = curveC.interface.parseLog({ topics: ev.topics as string[], data: ev.data });
    if (!parsed) continue;
    const amountNative = Number(ethers.formatEther(parsed.args.amountIn as bigint));
    const amountToken = Number(ethers.formatEther(parsed.args.amountOut as bigint));
    if (!(amountNative > 0) || !(amountToken > 0)) continue;
    const ts = await resolveTs(ev.blockNumber);
    trades.push({
      id: `${ev.transactionHash}-${ev.index}`.toLowerCase(),
      token,
      txHash: ev.transactionHash.toLowerCase(),
      logIndex: ev.index,
      blockNumber: ev.blockNumber,
      timestamp: new Date(ts),
      trader: String(parsed.args.sender).toLowerCase(),
      isBuy: true,
      amountNative,
      amountToken,
      priceNative: amountNative / amountToken,
      source: "curve",
    });
  }

  for (const ev of sells) {
    const parsed = curveC.interface.parseLog({ topics: ev.topics as string[], data: ev.data });
    if (!parsed) continue;
    const amountToken = Number(ethers.formatEther(parsed.args.amountIn as bigint));
    const amountNative = Number(ethers.formatEther(parsed.args.amountOut as bigint));
    if (!(amountNative > 0) || !(amountToken > 0)) continue;
    const ts = await resolveTs(ev.blockNumber);
    trades.push({
      id: `${ev.transactionHash}-${ev.index}`.toLowerCase(),
      token,
      txHash: ev.transactionHash.toLowerCase(),
      logIndex: ev.index,
      blockNumber: ev.blockNumber,
      timestamp: new Date(ts),
      trader: String(parsed.args.sender).toLowerCase(),
      isBuy: false,
      amountNative,
      amountToken,
      priceNative: amountNative / amountToken,
      source: "curve",
    });
  }

  return persistTrades(trades);
}

async function indexPairSwaps(
  pair: string,
  token: string,
  fromBlock: number,
  toBlock: number,
  provider: ethers.Provider,
) {
  const pairC = new ethers.Contract(pair, PAIR_ABI, provider);
  const token0 = ((await pairC.token0()) as string).toLowerCase();
  const tokenIs0 = token0 === token;
  const trades: IndexedTrade[] = [];
  const blockTs = new Map<number, number>();

  const resolveTs = async (bn: number) => {
    if (blockTs.has(bn)) return blockTs.get(bn)!;
    try {
      const b = await provider.getBlock(bn);
      const ms = b?.timestamp ? Number(b.timestamp) * 1000 : Date.now();
      blockTs.set(bn, ms);
      return ms;
    } catch {
      return Date.now();
    }
  };

  const swaps = await pairC.queryFilter(pairC.filters.Swap(), fromBlock, toBlock);
  for (const ev of swaps) {
    const parsed = pairC.interface.parseLog({ topics: ev.topics as string[], data: ev.data });
    if (!parsed) continue;
    const a0In = Number(ethers.formatEther(parsed.args.amount0In as bigint));
    const a1In = Number(ethers.formatEther(parsed.args.amount1In as bigint));
    const a0Out = Number(ethers.formatEther(parsed.args.amount0Out as bigint));
    const a1Out = Number(ethers.formatEther(parsed.args.amount1Out as bigint));

    let amountToken = 0;
    let amountNative = 0;
    let isBuy = false;
    if (tokenIs0) {
      amountToken = a0Out > 0 ? a0Out : a0In;
      amountNative = a1In > 0 ? a1In : a1Out;
      isBuy = a0Out > 0;
    } else {
      amountToken = a1Out > 0 ? a1Out : a1In;
      amountNative = a0In > 0 ? a0In : a0Out;
      isBuy = a1Out > 0;
    }
    if (!(amountToken > 0) || !(amountNative > 0)) continue;
    const ts = await resolveTs(ev.blockNumber);
    trades.push({
      id: `${ev.transactionHash}-${ev.index}`.toLowerCase(),
      token,
      txHash: ev.transactionHash.toLowerCase(),
      logIndex: ev.index,
      blockNumber: ev.blockNumber,
      timestamp: new Date(ts),
      trader: String(parsed.args.to).toLowerCase(),
      isBuy,
      amountNative,
      amountToken,
      priceNative: amountNative / amountToken,
      source: "dex",
    });
  }

  return persistTrades(trades);
}

/**
 * Index Buy/Sell (curve) + Swap (pair) into Mongo Trade + Candle collections.
 * Incremental per token via `lastTradeBlock`.
 */
export async function syncTradesToMongo(options?: { limit?: number; lookbackBlocks?: number }) {
  await connectMongo();
  const provider = getFreshPublicProvider();
  const latest = await provider.getBlockNumber();
  const lookback = options?.lookbackBlocks ?? 20_000;
  const limit = options?.limit ?? 30;

  const tokens = await TokenModel.find({
    curve: { $exists: true, $nin: ["", null] },
  })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select({ address: 1, curve: 1, pair: 1, lastTradeBlock: 1 })
    .lean();

  let tradeEvents = 0;
  let tokensIndexed = 0;

  for (const doc of tokens) {
    const token = lower(doc.address);
    const curve = doc.curve ? lower(doc.curve) : "";
    if (!isSetAddress(curve)) continue;

    const last = Number((doc as { lastTradeBlock?: number }).lastTradeBlock ?? 0);
    const fromBlock = last > 0 ? Math.min(latest, last + 1) : Math.max(0, latest - lookback);
    if (fromBlock > latest) continue;

    try {
      let n = await indexCurveTrades(curve, token, fromBlock, latest, provider);
      tradeEvents += n;

      const pair = doc.pair ? lower(doc.pair) : "";
      if (isSetAddress(pair)) {
        n = await indexPairSwaps(pair, token, fromBlock, latest, provider);
        tradeEvents += n;
      }

      await TokenModel.updateOne(
        { address: token },
        { $set: { lastTradeBlock: latest, tradesSyncedAt: new Date() } },
      );
      tokensIndexed += 1;
    } catch {
      /* skip token on RPC errors */
    }
  }

  return { tradeEvents, tokensIndexed, latest };
}

export type ChartTf = "5M" | "1H" | "6H" | "1D" | "ALL";

const TF_TO_INTERVAL: Record<ChartTf, CandleInterval> = {
  "5M": "1m",
  "1H": "1m",
  "6H": "5m",
  "1D": "5m",
  ALL: "1h",
};

const TF_MS: Record<ChartTf, number> = {
  "5M": 5 * 60_000,
  "1H": 60 * 60_000,
  "6H": 6 * 60 * 60_000,
  "1D": 24 * 60 * 60_000,
  ALL: 90 * 24 * 60 * 60_000,
};

/** Fast chart series from indexed candles (close prices). */
export async function getIndexedChartSeries(tokenAddress: string, tf: ChartTf = "1H") {
  await connectMongo();
  const token = lower(tokenAddress);
  const interval = TF_TO_INTERVAL[tf];
  const since = tf === "ALL" ? new Date(0) : new Date(Date.now() - TF_MS[tf]);

  const candles = await CandleModel.find({
    token,
    interval,
    openTime: { $gte: since },
  })
    .sort({ openTime: 1 })
    .limit(500)
    .lean();

  return candles.map(c => ({
    t: new Date(c.openTime).getTime(),
    v: c.close,
  }));
}

export async function getIndexedTrades(tokenAddress: string, limit = 40) {
  await connectMongo();
  const trades = await TradeModel.find({ token: lower(tokenAddress) })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
  return trades.map(t => ({
    id: t.id,
    buy: t.isBuy,
    trader: t.trader,
    amountNative: t.amountNative,
    amountToken: t.amountToken,
    priceNative: t.priceNative,
    timestamp: new Date(t.timestamp).toISOString(),
    txHash: t.txHash,
    source: t.source,
  }));
}
