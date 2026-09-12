"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Check, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { Spinner } from "../common/Spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../common/DropdownMenu";
import { arcTestnet } from "~~/config/chains";
import { ARC_CHAIN_LOGO_SRC } from "~~/icons/logos";
import { cn } from "~~/lib/utils";

interface ChainSwitchButtonProps {
  className?: string;
}

export default function ChainSwitchButton({
  className,
}: ChainSwitchButtonProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending } = useSwitchChain();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isConnected) return null;

  const isArc = chainId === arcTestnet.id;

  const handleSwitchToArc = async () => {
    if (isArc) return;
    try {
      await switchChainAsync({ chainId: arcTestnet.id });
      toast.success("Switched to Arc Testnet");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to switch to Arc Testnet",
      );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Chain selector"
          className={cn(
            "group inline-flex items-center gap-[0.6rem] outline-none transition-all duration-200 select-none",
            "h-[4rem] px-[1.2rem] sm:h-[4.4rem] sm:px-[1.4rem] rounded-full",
            isArc
              ? "border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white"
              : "border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 animate-pulse",
            className,
          )}
        >
          {isArc ? (
            <span className="relative flex size-[2rem] shrink-0 overflow-hidden rounded-full border border-white/20 bg-black/60">
              <Image
                src={ARC_CHAIN_LOGO_SRC}
                alt="Arc"
                fill
                className="object-cover"
                sizes="20px"
              />
            </span>
          ) : (
            <span className="flex size-[2rem] shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <AlertTriangle className="size-[1.2rem]" />
            </span>
          )}

          <div className="flex items-center gap-[0.45rem]">
            <span
              className={cn(
                "font-sans text-[1.2rem] font-medium sm:text-[1.3rem]",
                isArc ? "text-white/90" : "font-semibold text-amber-300",
              )}
            >
              {isArc ? "Arc Testnet" : "Wrong Network"}
            </span>
            <span
              className={cn(
                "size-[0.65rem] rounded-full",
                isArc ? "bg-emerald-400" : "bg-amber-400",
              )}
            />
          </div>

          <ChevronDown className="size-[1.3rem] text-white/50 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        sideOffset={8}
        align="end"
        className="w-[23rem] rounded-2xl border border-white/[0.08] bg-[#121212]/95 p-[1rem] backdrop-blur-xl"
      >
        <div className="mb-[0.8rem] px-[0.4rem] py-[0.2rem]">
          <p className="text-[1.1rem] uppercase tracking-wider text-white/40">
            Select Network
          </p>
          <p className="mt-[0.2rem] text-[1.15rem] text-white/70">
            Only <span className="font-semibold text-accent-500">Arc Testnet</span> is supported by Reflow.
          </p>
        </div>

        {/* Single Supported Chain: Arc Testnet */}
        <button
          type="button"
          disabled={isPending}
          onClick={() => void handleSwitchToArc()}
          className={cn(
            "flex w-full items-center justify-between rounded-xl p-[0.85rem] transition-all",
            isArc
              ? "bg-white/[0.06] text-white ring-1 ring-white/10"
              : "border border-accent-500/30 bg-accent-500/10 text-white hover:bg-accent-500/20",
          )}
        >
          <div className="flex items-center gap-[0.9rem]">
            <span className="relative flex size-[2.6rem] shrink-0 overflow-hidden rounded-full border border-white/20 bg-black/60">
              <Image
                src={ARC_CHAIN_LOGO_SRC}
                alt="Arc"
                fill
                className="object-cover"
                sizes="26px"
              />
            </span>
            <div className="text-left">
              <div className="flex items-center gap-[0.4rem]">
                <span className="font-sans text-[1.3rem] font-semibold text-white">
                  Arc Testnet
                </span>
                <span className="rounded-full bg-accent-500/20 px-[0.6rem] py-[0.1rem] text-[0.95rem] font-medium text-accent-500">
                  Active
                </span>
              </div>
              <p className="text-[1.1rem] text-white/40">Chain ID: {arcTestnet.id}</p>
            </div>
          </div>

          <div className="flex items-center">
            {isPending ? (
              <Spinner className="size-[1.4rem] text-accent-500" />
            ) : isArc ? (
              <span className="flex size-[2rem] items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <Check className="size-[1.2rem]" />
              </span>
            ) : (
              <span className="rounded-full bg-accent-500 px-[0.9rem] py-[0.35rem] font-sans text-[1.1rem] font-bold text-black transition-transform hover:scale-105">
                Switch
              </span>
            )}
          </div>
        </button>

        {!isArc && (
          <div className="mt-[0.8rem] rounded-xl border border-amber-500/20 bg-amber-500/10 p-[0.9rem] text-[1.15rem] leading-snug text-amber-200">
            You are connected to an unsupported network. Please switch to Arc Testnet to trade or create tokens.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
