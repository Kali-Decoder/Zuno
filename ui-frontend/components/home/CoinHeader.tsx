import React, { useEffect, useState } from "react";
import CopyAddressToClipboard from "../common/CopyAddressToClipboard";
import { cn } from "~~/lib/utils";

interface CoinHeaderProps {
  title: string;
  tokenId: string;
  creatorId: string;
  symbol: string;
  isWatchlisted: boolean;
  age: string; // Should be a future ISO string or UNIX timestamp
  className?: string;
}

const formatDuration = (seconds: number) => {
  if (seconds <= 0) return "Launched!";
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  return `${d}d ${h}h ${m}m ${s}s`;
};

const CoinHeader: React.FC<CoinHeaderProps> = ({ title, creatorId, tokenId, symbol, age, className }) => {
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    const target = new Date(age).getTime();

    const update = () => {
      const now = Date.now();
      const diffInSeconds = Math.floor((target - now) / 1000);
      setCountdown(formatDuration(diffInSeconds));
    };

    update(); // initial run
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [age]);

  return (
    <div className={cn("flex flex-col gap-[0.2rem] md:gap-[0.4rem] w-full flex-grow", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[0.4rem]">
          <h3 className="text-accent-500 font-bold">{title}</h3>
          <span className="text-[1rem] uppercase text-white/60">({symbol})</span>
        </div>
        <div className="text-[1rem] text-white/60 px-[0.8rem] py-[0.4rem] bg-white/5 rounded-full border border-white/10">
          <p>{countdown}</p>
        </div>
      </div>

      <div className="text-[0.8rem] md:text-[1.2rem] space-y-[0.4rem] text-white/60 ">
        <div className="md:text-[1.2rem] flex sm:flex-row flex-col-reverse items-start sm:items-center justify-between gap-[0.4rem]">
          <div className="flex items-center gap-[4px]">
            <span className="font-medium text-white/60">Created by:</span>
            <CopyAddressToClipboard address={creatorId} />
          </div>
        </div>
        <div className="flex items-center gap-[4px]">
          <span className="font-medium">Contract:</span>
          <CopyAddressToClipboard address={tokenId} />
        </div>
      </div>
    </div>
  );
};

export default CoinHeader;
