"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Settings2 } from "lucide-react";
import { formatUnits, zeroAddress } from "viem";
import TradeButton from "./PlaceTradeButton";
import ConnectWalletButton from "~~/components/common/ConnectWalletButton";
import { REFLOW } from "~~/config/reflow";
import { ARC_CHAIN_LOGO_SRC } from "~~/icons/logos";
import { maxBuyAmountIn, quoteTrade } from "~~/lib/reflow/actions";
import { formatToken, isSetAddress } from "~~/lib/reflow/format";
import { useAccount, useBalance } from "wagmi";
import { useTokenStore } from "~~/stores/tokenStore";
import { TradeOptions } from "~~/types/types";

const STEPPER_PERCENTAGES = ["25", "50", "75", "100"];

function AssetPill({
  symbol,
  imageUrl,
  native,
}: {
  symbol: string;
  imageUrl?: string;
  native?: boolean;
}) {
  const src = native ? ARC_CHAIN_LOGO_SRC : imageUrl;
  return (
    <div className="inline-flex items-center gap-[0.55rem] rounded-full bg-[#2a2a2a] py-[0.45rem] pl-[0.45rem] pr-[0.9rem]">
      <span className="relative size-[2.2rem] overflow-hidden rounded-full bg-black/40">
        {src ? (
          <Image src={src} alt={symbol} fill className="object-cover" sizes="22px" />
        ) : (
          <span className="grid size-full place-content-center text-[1rem] font-bold text-white/70">
            {symbol.slice(0, 1)}
          </span>
        )}
      </span>
      <span className="text-[1.25rem] font-semibold text-white">{symbol}</span>
    </div>
  );
}

function SwapPanel({
  label,
  amount,
  editable,
  onAmountChange,
  symbol,
  imageUrl,
  native,
  footerLeft,
  footerRight,
}: {
  label: string;
  amount: string;
  editable?: boolean;
  onAmountChange?: (v: string) => void;
  symbol: string;
  imageUrl?: string;
  native?: boolean;
  footerLeft: string;
  footerRight: string;
}) {
  return (
    <div className="rounded-[1.4rem] bg-[#1a1a1a] p-[1.2rem] sm:p-[1.4rem]">
      <div className="mb-[0.8rem] flex items-center justify-between">
        <span className="text-[1.2rem] text-white/45">{label}</span>
        <AssetPill symbol={symbol} imageUrl={imageUrl} native={native} />
      </div>

      {editable ? (
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={e => onAmountChange?.(e.target.value)}
          placeholder="0"
          className="w-full bg-transparent text-[3rem] font-medium leading-none tracking-tight text-white outline-none placeholder:text-white/25"
        />
      ) : (
        <p className="text-[3rem] font-medium leading-none tracking-tight text-white">
          {amount || "0"}
        </p>
      )}

      <div className="mt-[1rem] flex items-center justify-between text-[1.15rem] text-white/35">
        <span>{footerLeft}</span>
        <span className="tabular-nums">{footerRight}</span>
      </div>
    </div>
  );
}

function Trade({
  tradeType: initialType = "buy",
  isGraduated,
  poolAddress,
  tokenAddress: tokenAddressProp,
  tokenName,
  tokenSymbol,
  tokenImage,
}: {
  tradeType?: "buy" | "sell" | TradeOptions;
  isGraduated?: boolean;
  poolAddress?: `0x${string}`;
  tokenAddress?: `0x${string}`;
  tokenName?: string;
  tokenSymbol?: string;
  tokenImage?: string;
  referralAddress?: string;
}) {
  const { metadata, refetch, tokenAddress: storeTokenAddress } = useTokenStore();
  const { address: walletAddress, isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<bigint | undefined>();
  const [slippage] = useState("1");
  const initialSell = String(initialType).toLowerCase() === "sell";
  const [tradeType, setTradeType] = useState<TradeOptions>(initialSell ? TradeOptions.SELL : TradeOptions.BUY);

  const tokenAddress = useMemo(() => {
    const raw = tokenAddressProp || storeTokenAddress;
    return isSetAddress(raw) ? (raw as `0x${string}`) : null;
  }, [tokenAddressProp, storeTokenAddress]);

  const graduated = Boolean(isGraduated);
  const isBuy = tradeType === TradeOptions.BUY;
  const symbol = tokenSymbol || metadata?.symbol || "TKN";
  const name = tokenName || metadata?.name || symbol;
  const imageUrl =
    tokenImage || (typeof metadata?.image === "string" ? metadata.image : undefined) || "/zuno-logo.png";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokenAddress || !amount) {
        setQuote(undefined);
        return;
      }
      const q = await quoteTrade({
        tokenAddress,
        amount,
        tradeType: isBuy ? "buy" : "sell",
        isGraduated: graduated,
      });
      if (!cancelled) setQuote(q);
    })();
    return () => {
      cancelled = true;
    };
  }, [amount, tokenAddress, isBuy, graduated]);

  const { data: ethBalance, refetch: refetchEth } = useBalance({
    address: walletAddress,
    query: { enabled: !!walletAddress },
    unit: "wei",
  });

  const { data: tokenBalance, refetch: refetchTokenBal } = useBalance({
    address: walletAddress,
    token: tokenAddress ?? undefined,
    query: { enabled: !!walletAddress && !!tokenAddress },
    unit: "wei",
  });

  const refreshBalances = async () => {
    await Promise.all([refetchEth(), refetchTokenBal()]);
    setAmount("");
    setQuote(undefined);
    refetch?.();
  };

  const monBalLabel = ethBalance?.value != null ? Number(formatUnits(ethBalance.value, 18)).toFixed(4) : "0";
  const tokenBalLabel =
    tokenBalance?.value != null
      ? Number(formatUnits(tokenBalance.value, tokenBalance.decimals || 18)).toFixed(4)
      : "0";

  const quoteLabel = quote != null ? formatToken(quote, 18, 4) : "0";

  const applySpendable = async (pct: number) => {
    if (!walletAddress) return;
    if (isBuy) {
      const bal = ethBalance?.value;
      if (bal == null) return;
      const maxIn = await maxBuyAmountIn(bal, graduated);
      const spend = (maxIn * BigInt(Math.round(pct))) / 100n;
      setAmount(Number(formatUnits(spend, 18)).toFixed(6));
      return;
    }
    const bal = tokenBalance?.value;
    if (bal == null) return;
    const spend = (bal * BigInt(Math.round(pct))) / 100n;
    const adjusted = pct >= 100 ? (spend * 9998n) / 10000n : spend;
    setAmount(Number(formatUnits(adjusted, tokenBalance?.decimals || 18)).toFixed(6));
  };

  const handleAmountChange = (value: string) => {
    const sanitizedValue = value.replace(/[^\d.]/g, "");
    const decimalCount = (sanitizedValue.match(/\./g) || []).length;
    if (decimalCount > 1) return;
    const parts = sanitizedValue.split(".");
    if (parts[1] && parts[1].length > 6) return;
    setAmount(sanitizedValue);
  };

  const flipDirection = () => {
    setTradeType(isBuy ? TradeOptions.SELL : TradeOptions.BUY);
    setAmount("");
    setQuote(undefined);
  };

  const spender = graduated ? REFLOW.dexRouter : REFLOW.core;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-[1.6rem] flex items-center gap-[1rem]">
        <div className="relative size-[4.4rem] overflow-hidden rounded-[1.1rem] bg-black/40 ring-1 ring-white/10">
          <Image src={imageUrl} alt={name} fill className="object-cover" sizes="44px" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-[1.9rem] font-semibold text-white">{name}</h2>
          <p className="text-[1.2rem] text-white/40">{symbol}</p>
        </div>
      </div>

      <div className="relative space-y-[0.55rem]">
        <SwapPanel
          label="Sell"
          amount={amount}
          editable
          onAmountChange={handleAmountChange}
          symbol={isBuy ? "USDC" : symbol}
          imageUrl={isBuy ? undefined : imageUrl}
          native={isBuy}
          footerLeft="$0.00"
          footerRight={isBuy ? `USDC ${monBalLabel}` : `${symbol} ${tokenBalLabel}`}
        />

        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <button
            type="button"
            onClick={flipDirection}
            aria-label="Flip buy and sell"
            className="grid size-[3.4rem] place-content-center rounded-full border-[0.35rem] border-[#121212] bg-[#2a2a2a] text-white transition-colors hover:bg-[#333]"
          >
            <ArrowDownUp className="size-[1.5rem]" />
          </button>
        </div>

        <SwapPanel
          label="Buy"
          amount={quoteLabel}
          symbol={isBuy ? symbol : "USDC"}
          imageUrl={isBuy ? imageUrl : undefined}
          native={!isBuy}
          footerLeft="$0.00"
          footerRight={isBuy ? `${tokenBalLabel} available` : `${monBalLabel} available`}
        />
      </div>

      <div className="mt-[1rem] grid grid-cols-4 gap-[0.55rem]">
        {STEPPER_PERCENTAGES.map(step => (
          <button
            key={step}
            type="button"
            onClick={() => void applySpendable(Number(step))}
            className="rounded-full bg-[#1a1a1a] py-[0.7rem] text-[1.15rem] font-medium text-white/70 transition-colors hover:bg-[#222] hover:text-white"
          >
            {step}%
          </button>
        ))}
      </div>

      <div className="mt-[1.2rem] flex-1" />

      {isConnected && walletAddress && tokenAddress ? (
        <TradeButton
          tradeType={tradeType}
          amount={amount}
          userAddress={walletAddress}
          poolAddress={(poolAddress || zeroAddress) as `0x${string}`}
          tokenAddress={tokenAddress}
          refetchData={refreshBalances}
          spenderAddress={spender as `0x${string}`}
          referralAddress={walletAddress}
          isGraduated={graduated}
        />
      ) : (
        <ConnectWalletButton className="h-auto w-full rounded-[1.2rem] px-[1.6rem] py-[1.3rem] text-[1.4rem] hover:bg-accent-600">
          Connect to trade
        </ConnectWalletButton>
      )}

      <div className="mt-[1rem] flex items-center justify-between text-[1.2rem] text-white/40">
        <span>Slippage</span>
        <button
          type="button"
          className="inline-flex items-center gap-[0.45rem] rounded-full bg-[#1a1a1a] px-[1rem] py-[0.55rem] text-white/70 transition-colors hover:bg-[#222] hover:text-white"
        >
          <span className="tabular-nums">{slippage}%</span>
          <Settings2 className="size-[1.25rem] opacity-70" />
          <span>Adjust</span>
        </button>
      </div>
    </div>
  );
}

export default Trade;
