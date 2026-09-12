"use client";

import React, { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useSwitchChain } from "wagmi";
import toast from "react-hot-toast";
import { Spinner } from "./Spinner";
import { arcTestnet } from "~~/config/chains";
import { cn } from "~~/lib/utils";

export type ConnectWalletButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loadingText?: string;
  isLoading?: boolean;
};

const baseClass =
  "inline-flex items-center justify-center gap-[0.6rem] rounded-full bg-accent-500 " +
  "h-[4rem] px-[2.2rem] sm:h-[4.4rem] sm:px-[2.8rem] " +
  "font-area text-[1.5rem] sm:text-[1.7rem] font-black tracking-[-0.02em] leading-none text-black " +
  "transition-colors hover:bg-accent-500/90 " +
  "disabled:cursor-not-allowed disabled:opacity-70";

function labelFromChildren(children: React.ReactNode) {
  if (children === "Connect Wallet" || children == null) return "Connect";
  return children;
}

const ConnectWalletButton: React.FC<ConnectWalletButtonProps> = ({
  className,
  children = "Connect",
  onClick,
  type = "button",
  loadingText = "Connecting",
  isLoading = false,
  ...props
}) => {
  const { ready, authenticated, login } = usePrivy();
  const { isConnected, chainId } = useAccount();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const [busyLocal, setBusyLocal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const wrongNetwork = mounted && authenticated && isConnected && chainId !== arcTestnet.id;
  const busy = busyLocal || isLoading || isSwitching || (mounted && !ready);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    if (wrongNetwork) {
      setBusyLocal(true);
      void switchChainAsync({ chainId: arcTestnet.id })
        .catch(err => {
          toast.error(err instanceof Error ? err.message : "Network switch failed");
        })
        .finally(() => setBusyLocal(false));
      onClick?.(e);
      return;
    }

    setBusyLocal(true);
    try {
      login();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open login");
    } finally {
      // Privy modal owns the flow; clear local busy shortly after open
      setTimeout(() => setBusyLocal(false), 400);
    }
    onClick?.(e);
  };

  if (!mounted) {
    return (
      <button type={type} {...props} disabled className={cn(baseClass, className)} aria-busy={false}>
        <span>{labelFromChildren(children)}</span>
      </button>
    );
  }

  return (
    <button
      type={type}
      {...props}
      disabled={busy}
      onClick={handleClick}
      aria-busy={busy}
      className={cn(baseClass, className)}
    >
      {busy ? (
        <>
          <span>{wrongNetwork ? "Switching…" : loadingText}</span>
          <Spinner className="h-[1.3rem] w-[1.3rem] text-black" />
        </>
      ) : (
        <span>{wrongNetwork ? "Switch to Arc" : labelFromChildren(children)}</span>
      )}
    </button>
  );
};

export default ConnectWalletButton;
