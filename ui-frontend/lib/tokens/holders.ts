import { ethers } from "ethers";
import { connectMongo } from "~~/lib/db/mongodb";
import { TokenModel } from "~~/models/Token";
import { TradeModel } from "~~/models/Trade";
import { getFreshPublicProvider, EXPLORER_URL } from "~~/lib/reflow/provider";
import { REFLOW, FACTORY_ABI } from "~~/config/reflow";
import {
  fetchSubgraphToken,
  fetchSubgraphTrades,
  isSubgraphConfigured,
} from "~~/lib/subgraph/client";

export type TokenHolder = {
  rank: number;
  address: string;
  balance: number;
  balanceFormatted: string;
  percentage: number;
  percentageFormatted: string;
  label?: string | null;
  isContract: boolean;
  txHash?: string | null;
  txUrl?: string | null;
  addressUrl: string;
};

export async function resolveHolders(tokenAddress: string): Promise<{
  ok: boolean;
  holders: TokenHolder[];
  totalSupply: number;
  holderCount: number;
}> {
  const normToken = tokenAddress.toLowerCase();
  const provider = getFreshPublicProvider();

  // 1. Gather candidate addresses from all available sources
  const candidateMap = new Map<
    string,
    { label?: string | null; isContract: boolean; txHash?: string | null }
  >();

  // Check on-chain curve and pair
  try {
    const factory = new ethers.Contract(REFLOW.bondingCurveFactory, FACTORY_ABI, provider);
    const curveAddr = await factory.getCurve(normToken);
    if (curveAddr && curveAddr !== ethers.ZeroAddress) {
      candidateMap.set(curveAddr.toLowerCase(), {
        label: "Bonding Curve",
        isContract: true,
      });

      const curveAbi = ["function pair() view returns (address)"];
      const curveContract = new ethers.Contract(curveAddr, curveAbi, provider);
      const pairAddr = await curveContract.pair().catch(() => null);
      if (pairAddr && pairAddr !== ethers.ZeroAddress) {
        candidateMap.set(pairAddr.toLowerCase(), {
          label: "Uniswap V2 Pair",
          isContract: true,
        });
      }
    }
  } catch {
    /* on-chain factory optional */
  }

  // Check Subgraph
  if (isSubgraphConfigured()) {
    try {
      const [sgToken, sgTrades] = await Promise.all([
        fetchSubgraphToken(normToken).catch(() => null),
        fetchSubgraphTrades(normToken, 100).catch(() => []),
      ]);

      if (sgToken?.creator) {
        const creatorAddr = sgToken.creator.toLowerCase();
        if (!candidateMap.has(creatorAddr)) {
          candidateMap.set(creatorAddr, { label: "Creator", isContract: false });
        }
      }
      if (sgToken?.curve) {
        const cAddr = sgToken.curve.toLowerCase();
        if (!candidateMap.has(cAddr)) {
          candidateMap.set(cAddr, { label: "Bonding Curve", isContract: true });
        }
      }
      if (sgToken?.pair && sgToken.pair !== ethers.ZeroAddress) {
        const pAddr = sgToken.pair.toLowerCase();
        if (!candidateMap.has(pAddr)) {
          candidateMap.set(pAddr, { label: "Uniswap V2 Pair", isContract: true });
        }
      }

      for (const t of sgTrades) {
        const trAddr = (t.trader || "").toLowerCase();
        if (!trAddr || trAddr === ethers.ZeroAddress) continue;
        const txHash = t.txHash || (t.id.includes("-") ? t.id.split("-")[0] : null);
        if (!candidateMap.has(trAddr)) {
          candidateMap.set(trAddr, { label: null, isContract: false, txHash });
        } else {
          const prev = candidateMap.get(trAddr)!;
          if (!prev.txHash && txHash) prev.txHash = txHash;
        }
      }
    } catch {
      /* subgraph optional */
    }
  }

  // Check MongoDB
  try {
    await connectMongo();
    const [tokenDoc, mongoTrades] = await Promise.all([
      TokenModel.findOne({ address: normToken }).lean().catch(() => null),
      TradeModel.find({ token: normToken }).sort({ timestamp: -1 }).limit(100).lean().catch(() => []),
    ]);

    if (tokenDoc?.creator) {
      const creatorAddr = tokenDoc.creator.toLowerCase();
      if (!candidateMap.has(creatorAddr)) {
        candidateMap.set(creatorAddr, {
          label: "Creator",
          isContract: false,
          txHash: tokenDoc.txHash || null,
        });
      } else {
        const prev = candidateMap.get(creatorAddr)!;
        if (!prev.label) prev.label = "Creator";
        if (!prev.txHash && tokenDoc.txHash) prev.txHash = tokenDoc.txHash;
      }
    }
    if (tokenDoc?.curve) {
      const cAddr = tokenDoc.curve.toLowerCase();
      if (!candidateMap.has(cAddr)) {
        candidateMap.set(cAddr, { label: "Bonding Curve", isContract: true });
      }
    }
    if (tokenDoc?.pair) {
      const pAddr = tokenDoc.pair.toLowerCase();
      if (!candidateMap.has(pAddr)) {
        candidateMap.set(pAddr, { label: "Uniswap V2 Pair", isContract: true });
      }
    }

    for (const t of mongoTrades) {
      const trAddr = (t.trader || "").toLowerCase();
      if (!trAddr || trAddr === ethers.ZeroAddress) continue;
      if (!candidateMap.has(trAddr)) {
        candidateMap.set(trAddr, { label: null, isContract: false, txHash: t.txHash });
      } else {
        const prev = candidateMap.get(trAddr)!;
        if (!prev.txHash && t.txHash) prev.txHash = t.txHash;
      }
    }
  } catch {
    /* mongo optional */
  }

  // 2. Query live on-chain balances & supply
  const tokenContract = new ethers.Contract(
    normToken,
    [
      "function balanceOf(address) view returns (uint256)",
      "function totalSupply() view returns (uint256)",
    ],
    provider,
  );

  let totalSupplyNum = 1_000_000_000;
  try {
    const rawSupply = await tokenContract.totalSupply();
    totalSupplyNum = Number(ethers.formatEther(rawSupply));
  } catch {
    /* fallback to 1B */
  }

  const entries = Array.from(candidateMap.entries());
  const balanceResults = await Promise.all(
    entries.map(async ([address, meta]) => {
      try {
        const bal = await tokenContract.balanceOf(address);
        const balNum = Number(ethers.formatEther(bal));
        return { address, meta, balance: balNum };
      } catch {
        return { address, meta, balance: 0 };
      }
    }),
  );

  const activeHolders = balanceResults
    .filter(h => h.balance > 0.000001)
    .sort((a, b) => b.balance - a.balance);

  const holders: TokenHolder[] = activeHolders.map((h, idx) => {
    const percentage = totalSupplyNum > 0 ? (h.balance / totalSupplyNum) * 100 : 0;
    return {
      rank: idx + 1,
      address: h.address,
      balance: h.balance,
      balanceFormatted: h.balance.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: h.balance < 1 ? 4 : 2,
      }),
      percentage,
      percentageFormatted: `${percentage.toFixed(2)}%`,
      label: h.meta.label || null,
      isContract: h.meta.isContract,
      txHash: h.meta.txHash || null,
      txUrl: h.meta.txHash ? `${EXPLORER_URL}/tx/${h.meta.txHash}` : null,
      addressUrl: `${EXPLORER_URL}/address/${h.address}`,
    };
  });

  return {
    ok: true,
    holders,
    totalSupply: totalSupplyNum,
    holderCount: holders.length,
  };
}
