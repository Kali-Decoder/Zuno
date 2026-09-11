import React from "react";
import { formatUnits } from "viem";
import { formatToken } from "~~/lib/reflow/format";
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
  onMaxClick?: () => void;
}

function TradeInfoCard({
  tokenQuote,
  amount,
  ethBalance,
  tokenBalance,
  mode,
  decimals = 18,
  metadata: metadataProp,
  onAmountChange,
  onMaxClick,
}: TradeInfoCardProps) {
  const storeMeta = useTokenStore(s => s.metadata);
  const isLoading = useTokenStore(s => s.isLoading);
  const error = useTokenStore(s => s.error);
  const metadata = metadataProp ?? storeMeta;
  const isBuy = mode === TradeOptions.BUY;

  if (isLoading || !metadata) {
    return (
      <div className="animate-pulse rounded-[1.2rem] border border-white/[0.06] bg-white/[0.03] px-[1.2rem] py-[1.4rem]">
        <div className="h-8 w-32 rounded bg-white/10" />
        <div className="mt-3 h-4 w-24 rounded bg-white/10" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.2rem] border border-red-500/20 bg-red-500/5 px-[1.2rem] py-[1.2rem] text-[1.2rem] text-red-300">
        {error.message}
      </div>
    );
  }

  const displayBalance = isBuy
    ? ethBalance != null
      ? Number(formatUnits(ethBalance, 18)).toFixed(4)
      : "0.00"
    : tokenBalance != null
      ? Number(formatUnits(tokenBalance, decimals)).toFixed(4)
      : "0.00";

  const inputSymbol = isBuy ? "USDC" : metadata.symbol;
  const receiveSymbol = isBuy ? metadata.symbol : "USDC";
  const receiveAmount = formatToken(tokenQuote ?? 0n, decimals, 4);

  return (
    <div className="rounded-[1.2rem] border border-white/[0.06] bg-white/[0.03] p-[1.2rem] sm:p-[1.4rem]">
      <div className="flex items-start justify-between gap-[1rem]">
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={e => onAmountChange(e.target.value)}
          placeholder="0.0"
          className="w-full bg-transparent text-[2.4rem] font-medium tracking-tight text-white outline-none placeholder:text-white/20"
        />
        <span className="mt-[0.4rem] shrink-0 rounded-full bg-white/[0.06] px-[1rem] py-[0.4rem] text-[1.15rem] font-medium text-white/70">
          {inputSymbol}
        </span>
      </div>

      <div className="mt-[1rem] flex items-center justify-between text-[1.15rem] text-white/40">
        <p>
          Receive{" "}
          <span className="font-medium text-white/80">
            {receiveAmount} {receiveSymbol}
          </span>
        </p>
        <div className="flex items-center gap-[0.6rem]">
          <span className="tabular-nums">
            {displayBalance} {inputSymbol}
          </span>
          <button
            type="button"
            onClick={() => onMaxClick?.()}
            className="font-medium text-accent-500 transition-opacity hover:opacity-80"
          >
            MAX
          </button>
        </div>
      </div>
    </div>
  );
}

export default TradeInfoCard;
