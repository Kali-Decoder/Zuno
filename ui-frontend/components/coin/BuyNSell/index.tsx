"use client";

import React, { useState } from "react";
import TradeButton from "./PlaceTradeButton";
import TradeInfoCard from "./TradeInfoCard";
import { usePrivy } from "@privy-io/react-auth";
import { formatUnits, parseEther } from "viem";
import { useBalance } from "wagmi";
import ConnectWalletButton from "~~/components/common/ConnectWalletButton";
import { REFLOW } from "~~/config/reflow";
import { useTokenStore } from "~~/stores/tokenStore";
import { TradeOptions } from "~~/types/types";

const STEPPER_PERCENTAGES = ["25", "50", "75", "100"];

function mockQuote(amount: string, tradeType: TradeOptions): bigint | undefined {
  if (!amount || Number(amount) <= 0) return undefined;
  try {
    const inWei = parseEther(amount);
    // Simple mock: 1 MON ≈ 1000 tokens
    if (tradeType === "buy") return inWei * 1000n;
    return inWei / 1000n;
  } catch {
    return undefined;
  }
}

function Trade({
  tradeType,
  isGraduated,
  poolAddress,
}: {
  tradeType: TradeOptions;
  isGraduated?: boolean;
  poolAddress?: `0x${string}`;
  referralAddress?: string;
}) {
  const { metadata, refetch, tokenAddress } = useTokenStore();
  const { user } = usePrivy();
  const [amount, setAmount] = useState("");

  const quote = mockQuote(amount, tradeType);

  const { data: ethBalance } = useBalance({
    address: user?.wallet?.address,
    query: {
      enabled: tradeType === "buy" && !!user?.wallet?.address,
    },
    unit: "wei",
  });

  const { data: tokenBalance } = useBalance({
    address: user?.wallet?.address,
    token: tokenAddress as string,
    query: {
      enabled: tradeType === "sell" && !!user?.wallet?.address && !!tokenAddress,
    },
    unit: "wei",
  });

  const handlePercentageClick = (percentage: string) => {
    if (!user?.wallet?.address) return;
    const balance = tradeType === "buy" ? ethBalance?.value : tokenBalance?.value;
    if (balance) {
      const maxAmount = formatUnits(balance, 18);
      const calculatedAmount = (Number(maxAmount) * Number(percentage)) / 100;
      setAmount(Number(calculatedAmount).toFixed(2).toString());
    }
  };

  const handleAmountChange = (value: string) => {
    const sanitizedValue = value.replace(/[^\d.]/g, "");
    const decimalCount = (sanitizedValue.match(/\./g) || []).length;
    if (decimalCount > 1) return;
    const parts = sanitizedValue.split(".");
    if (parts[1] && parts[1].length > 2) return;
    setAmount(sanitizedValue);
  };

  const handleMaxClick = (maxAmount: string) => {
    if (tradeType === "sell") {
      setAmount((Number(maxAmount) * 0.9998).toFixed(2));
    } else {
      setAmount(Number(maxAmount).toFixed(2));
    }
  };

  return (
    <div className="space-y-[1.2rem] sm:space-y-[2rem]">
      <div className="space-y-[0.8rem] sm:space-y-[1.2rem]">
        <TradeInfoCard
          tokenQuote={quote}
          amount={amount}
          ethBalance={ethBalance?.value}
          tokenBalance={tokenBalance?.value}
          mode={tradeType}
          decimals={tokenBalance?.decimals}
          metadata={metadata}
          onAmountChange={handleAmountChange}
          onMaxClick={handleMaxClick}
        />
        <div className="flex gap-[0.8rem] text-[0.8rem] sm:text-[1.2rem] font-bold text-white">
          {STEPPER_PERCENTAGES.map((step, idx) => (
            <button
              key={idx}
              onClick={() => handlePercentageClick(step)}
              className="bg-white/5 py-[0.4rem] px-[0.8rem] rounded-full transition-colors cursor-pointer"
            >
              {step}%
            </button>
          ))}
        </div>
      </div>

      {user?.wallet?.address ? (
        <TradeButton
          tradeType={tradeType}
          amount={amount}
          userAddress={user?.wallet?.address as `0x${string}`}
          poolAddress={poolAddress as `0x${string}`}
          tokenAddress={tokenAddress}
          refetchData={refetch}
          spenderAddress={REFLOW.core as `0x${string}`}
          referralAddress={user?.wallet?.address as `0x${string}`}
          isGraduated={isGraduated || false}
        />
      ) : (
        <ConnectWalletButton className="h-auto w-full rounded-sm px-[1.6rem] py-[1.2rem] text-[1.4rem] hover:bg-accent-600">
          Connect to trade
        </ConnectWalletButton>
      )}
    </div>
  );
}

export default Trade;
