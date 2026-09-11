"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ErrorMsg from "~~/components/common/ErrorMsg";
import HoverButton from "~~/components/common/HoverButton";
import { Spinner } from "~~/components/common/Spinner";
import { buyToken, getCurveProgress, getTokenMarketStats, sellToken } from "~~/lib/reflow/actions";
import { persistTokenPatch } from "~~/lib/tokens/adapters";
import { decodeCallError } from "~~/lib/reflow/tx";
import { useReflowWallet } from "~~/hooks/useReflowWallet";
import { useTokenStore } from "~~/stores/tokenStore";
import { TradeOptions } from "~~/types/types";

export default function TradeButton({
  tradeType,
  amount,
  refetchData,
  tokenAddress,
  isGraduated,
}: {
  tradeType: TradeOptions;
  amount: string;
  poolAddress: `0x${string}`;
  userAddress: `0x${string}`;
  refetchData: (() => void | Promise<void>) | null;
  spenderAddress: `0x${string}`;
  referralAddress: `0x${string}` | null;
  tokenAddress: `0x${string}` | null;
  isGraduated: boolean;
}) {
  const wallet = useReflowWallet();
  const metadata = useTokenStore(s => s.metadata);
  const bumpDataEpoch = useTokenStore(s => s.bumpDataEpoch);
  const storeRefetch = useTokenStore(s => s.refetch);
  const [isPendingBuy, setIsPendingBuy] = useState(false);
  const [isPendingSell, setIsPendingSell] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Persist latest on-chain market / curve state to Mongo after a fill. */
  const touchMongo = async () => {
    if (!tokenAddress) return;
    let progress: number | undefined;
    let curveLocked = false;
    let listed = isGraduated;
    let curve = "";
    let pair = "";
    let marketCapUsd: number | undefined;
    let volumeUsd: number | undefined;
    let priceNative: number | undefined;
    try {
      const [p, stats] = await Promise.all([
        getCurveProgress(tokenAddress),
        getTokenMarketStats(tokenAddress).catch(() => null),
      ]);
      progress = p.progress;
      curveLocked = p.locked;
      listed = p.listed || isGraduated;
      curve = p.curve;
      pair = p.pair;
      if (stats) {
        marketCapUsd = stats.marketCapUsd;
        volumeUsd = stats.volumeUsd;
        priceNative = stats.priceNative;
        if (stats.curve) curve = stats.curve;
        if (stats.pair) pair = stats.pair;
        if (stats.listed) listed = true;
        if (stats.progress != null) progress = stats.progress;
      }
    } catch {
      /* optional */
    }
    await persistTokenPatch({
      address: tokenAddress,
      name: metadata?.name || "Token",
      symbol: metadata?.symbol || "TKN",
      imageUrl: typeof metadata?.image === "string" ? metadata.image : undefined,
      lastBuyAt: new Date().toISOString(),
      graduated: listed,
      isListing: listed,
      curveLocked,
      progress,
      phase: listed ? "listed" : curveLocked ? "locked" : "bonding",
      curve: curve || undefined,
      pair: pair || undefined,
      marketCapUsd,
      volumeUsd,
      priceNative,
    });
  };

  const afterTradeSuccess = async (kind: "buy" | "sell") => {
    toast.success(kind === "buy" ? "Buy submitted" : "Sell submitted");
    bumpDataEpoch();
    try {
      await touchMongo();
    } catch {
      /* non-blocking */
    }
    await Promise.resolve(refetchData?.());
    storeRefetch?.();

    // Subgraph / RPC lag — refresh again so chart, trades, and mcap catch up.
    window.setTimeout(() => {
      bumpDataEpoch();
      storeRefetch?.();
      void Promise.resolve(refetchData?.());
    }, 2_500);
    window.setTimeout(() => {
      bumpDataEpoch();
      storeRefetch?.();
    }, 6_000);
  };

  const writeBuyAsyncWithParams = async () => {
    if (!tokenAddress) {
      setError("Token address missing");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setIsPendingBuy(true);
    setError(null);
    try {
      const ok = await wallet.runWrite(async signer => {
        await buyToken({
          signer,
          account: wallet.account,
          tokenAddress,
          amount,
          isGraduated,
        });
      });
      if (ok) {
        await afterTradeSuccess("buy");
      }
    } catch (e: any) {
      const msg = decodeCallError(e, "buy");
      setError(msg);
      toast.error(msg);
    }
    setIsPendingBuy(false);
  };

  const writeSellAsyncWithParams = async () => {
    if (!tokenAddress) {
      setError("Token address missing");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setIsPendingSell(true);
    setError(null);
    try {
      const ok = await wallet.runWrite(async signer => {
        await sellToken({
          signer,
          account: wallet.account,
          tokenAddress,
          amount,
          isGraduated,
        });
      });
      if (ok) {
        await afterTradeSuccess("sell");
      }
    } catch (e: any) {
      const msg = decodeCallError(e, "sell");
      setError(msg);
      toast.error(msg);
    }
    setIsPendingSell(false);
  };

  const getButtonConfig = () => {
    const symbol = metadata?.symbol || "tokens";
    if (tradeType === TradeOptions.SELL) {
      if (isPendingSell || wallet.isSubmitting) {
        return { text: "Confirm in wallet…", handler: () => {}, disabled: true };
      }
      return {
        text: `Sell ${symbol}`,
        handler: writeSellAsyncWithParams,
        disabled: isPendingSell || wallet.isSubmitting,
      };
    }

    if (isPendingBuy || wallet.isSubmitting) {
      return { text: "Confirm in wallet…", handler: () => {}, disabled: true };
    }
    return {
      text: `Buy ${symbol}`,
      handler: writeBuyAsyncWithParams,
      disabled: isPendingBuy || wallet.isSubmitting,
    };
  };

  const buttonConfig = getButtonConfig();
  const isLoading = isPendingBuy || isPendingSell || wallet.isSubmitting;

  return (
    <div className="space-y-[0.8rem]">
      <HoverButton
        className="w-full !rounded-[1.2rem] !py-[1.35rem] text-[1.45rem]"
        handleOnClick={buttonConfig.handler}
      >
        <div className="flex items-center justify-center gap-[0.8rem]">
          {buttonConfig.text}
          {isLoading && <Spinner />}
        </div>
      </HoverButton>
      {error && <ErrorMsg errorType="Transaction" errorText={error} />}
    </div>
  );
}
