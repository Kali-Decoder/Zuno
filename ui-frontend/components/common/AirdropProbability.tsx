"use client";

import { Spinner } from "./Spinner";
import { useAccount } from "wagmi";
import { useGetAccount } from "~~/hooks/api-hooks";

// adjust path as needed

const AirdropProbability = () => {
  const { address: accountAddress, isConnected, status } = useAccount();
  const ready = status !== "connecting" && status !== "reconnecting";
  const { data, loading: isLoading } = useGetAccount(accountAddress || "");
  if (!isConnected || !ready || !accountAddress) return null;
  return (
    <div className="flex items-center gap-[0.6rem] sm:gap-[0.8rem] bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.12] rounded-xl px-[1rem] sm:px-[1.4rem] py-[0.6rem] sm:py-[0.8rem] transition-all duration-200 backdrop-blur-sm">
      <div className="flex items-center gap-[0.4rem] sm:gap-[0.6rem]">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
        <span className="text-white/80 font-medium text-[0.8rem] sm:text-[1rem]">Reputation Score</span>
      </div>
      <div className="bg-white/[0.05] rounded-lg px-[0.6rem] sm:px-[0.8rem] py-[0.3rem] sm:py-[0.4rem]">
        {isLoading ? (
          <Spinner className="w-[1.2rem] h-[1.2rem] sm:w-[1.4rem] sm:h-[1.4rem]" />
        ) : (
          <span className="text-white font-bold text-[0.9rem] sm:text-[1.1rem]">
            {(data?.reputation ?? 0).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default AirdropProbability;
