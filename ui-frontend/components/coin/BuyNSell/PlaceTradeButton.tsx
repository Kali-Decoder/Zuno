"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ErrorMsg from "~~/components/common/ErrorMsg";
import HoverButton from "~~/components/common/HoverButton";
import { Spinner } from "~~/components/common/Spinner";
import { buyToken, sellToken } from "~~/lib/reflow/actions";
import { decodeCallError } from "~~/lib/reflow/tx";
import { useReflowWallet } from "~~/hooks/useReflowWallet";
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
  refetchData: (() => void) | null;
  spenderAddress: `0x${string}`;
  referralAddress: `0x${string}` | null;
  tokenAddress: `0x${string}` | null;
  isGraduated: boolean;
}) {
  const wallet = useReflowWallet();
  const [isPendingBuy, setIsPendingBuy] = useState(false);
  const [isPendingSell, setIsPendingSell] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        toast.success("Buy submitted");
        refetchData?.();
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
        toast.success("Sell submitted");
        refetchData?.();
      }
    } catch (e: any) {
      const msg = decodeCallError(e, "sell");
      setError(msg);
      toast.error(msg);
    }
    setIsPendingSell(false);
  };

  const getButtonConfig = () => {
    if (tradeType === TradeOptions.SELL) {
      if (isPendingSell || wallet.isSubmitting) {
        return { text: "Waiting for Confirmation", handler: () => {}, disabled: true };
      }
      return {
        text: "Sell Tokens",
        handler: writeSellAsyncWithParams,
        disabled: isPendingSell || wallet.isSubmitting,
      };
    }

    if (isPendingBuy || wallet.isSubmitting) {
      return { text: "Waiting for Confirmation", handler: () => {}, disabled: true };
    }
    return {
      text: "Buy Tokens",
      handler: writeBuyAsyncWithParams,
      disabled: isPendingBuy || wallet.isSubmitting,
    };
  };

  const buttonConfig = getButtonConfig();
  const isLoading = isPendingBuy || isPendingSell || wallet.isSubmitting;

  return (
    <div className="space-y-[1.6rem]">
      <HoverButton className="w-full" handleOnClick={buttonConfig.handler}>
        <div className="flex items-center gap-[0.8rem] ">
          {buttonConfig.text}
          {isLoading && <Spinner />}
        </div>
      </HoverButton>
      {error && <ErrorMsg errorType="Transaction" errorText={error} />}
    </div>
  );
}
