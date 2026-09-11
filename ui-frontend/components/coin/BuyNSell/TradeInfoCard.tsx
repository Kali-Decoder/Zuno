import React from "react";
import Image from "next/image";
import { formatEther, formatUnits } from "viem";
import { useTokenStore } from "~~/stores/tokenStore";
import { TokenMetadata, TradeOptions } from "~~/types/types";

interface TradeInfoCardProps {
  tokenQuote?: bigint;
  amount?: string;
  ethBalance?: bigint;
  tokenBalance?: bigint;
  mode?: TradeOptions;
  decimals?: number;
  metadata: TokenMetadata | null;
  onAmountChange: (value: string) => void;
  onMaxClick?: (value: string) => void;
}

function TradeInfoCard({
  tokenQuote,
  amount,
  ethBalance,
  tokenBalance,
  mode,
  decimals,
  onAmountChange,
  onMaxClick,
}: TradeInfoCardProps) {
  const { metadata, isLoading, error } = useTokenStore();

  if (isLoading || !metadata) {
    return (
      <div className="border border-1 border-gray-800 bg-white-4 rounded-2xl py-3 px-4 animate-pulse">
        <div className="flex justify-between">
          <div className="h-7 w-32 bg-gray-300 rounded"></div>
          <div className="h-7 w-24 bg-gray-300 rounded"></div>
        </div>
        <div className="flex justify-between mt-2">
          <div className="h-5 w-20 bg-gray-300 rounded"></div>
          <div className="h-5 w-40 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-1 border-gray-800 bg-white-4 rounded-2xl py-3 px-4">
        <div className="text-error-500">Error: {error.message}</div>
      </div>
    );
  }

  const formattedUsdValue = (Number(amount || 0) * Number(0)).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  }); //tokenData.price

  const handleMaxClick = () => {
    if (onMaxClick) {
      if (mode === "buy" && ethBalance) {
        onMaxClick(formatUnits(ethBalance, 18));
      } else if (mode === "sell" && tokenBalance) {
        onMaxClick(formatUnits(tokenBalance, decimals || 18));
      }
    }
  };

  // Display balance based on mode with ETH showing 2 decimal places
  const displayBalance =
    mode === "buy"
      ? ethBalance
        ? Number(formatUnits(ethBalance, 18)).toFixed(2)
        : "0.00"
      : tokenBalance
        ? Number(formatUnits(tokenBalance, 18)).toFixed(2) // Use nullish coalescing
        : "0.00";

  // Display symbol based on mode
  const displaySymbol = mode === "buy" ? "TMON" : metadata.symbol;

  console.log(tokenQuote);

  return (
    <div className="border border-white/5 bg-white/5 rounded-md p-[0.8rem] md:py-[1.2rem] md:px-[1.6rem] grid grid-rows-[repeat(2,auto)] gap-y-[1rem] md:gap-y-[1.6rem]">
      <div className="grid grid-cols-2 items-start justify-between">
        <input
          type="text"
          value={amount}
          onChange={e => onAmountChange(e.target.value)}
          placeholder="0.0"
          className="bg-transparent border-b border-white/20 text-[1.2rem]  md:text-[2rem] text-white outline-none outline "
        />
        <div className="text-[0.6rem] md:text-[1.2rem] font-bold uppercase flex items-center gap-[0.8rem] rounded-full bg-white/5 py-[4px] px-[1.2rem] leading-tight w-fit justify-self-end">
          <span>{displaySymbol}</span>
        </div>
      </div>
      <div className="flex justify-between text-white/60 uppercase text-[0.8rem] md:text-[1.4rem]">
        <p>{formattedUsdValue}</p>
        <div className="flex items-center gap-[0.8rem]">
          <p>
            {displayBalance} {displaySymbol}
          </p>
          <button onClick={handleMaxClick} className="text-accent-500 transition-colors cursor-pointer">
            MAX
          </button>
        </div>
      </div>
      <div className="flex w-full">
        <p className="text-[0.8rem] md:text-[1.2rem] text-white/80">
          Receives:{" "}
          <span className="font-bold">
            Receive: {Number(formatUnits(tokenQuote ? tokenQuote[0] : 0, decimals || 18)).toFixed(2)}{" "}
            {mode === "buy" ? metadata.symbol : "ETH"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default TradeInfoCard;
