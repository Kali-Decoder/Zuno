"use client";

import React, { useEffect, useState } from "react";
import { Spinner } from "./Spinner";
import {
  ConnectorAlreadyConnectedError,
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import toast from "react-hot-toast";
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

function pickConnector(connectors: ReturnType<typeof useConnect>["connectors"]) {
  return (
    connectors.find(c => c.id === "injected") ??
    connectors.find(c => c.type === "injected") ??
    connectors[0]
  );
}

function shouldRetryConnect(err: unknown): boolean {
  if (err instanceof ConnectorAlreadyConnectedError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /already connected|connection already|resource unavailable|-32002/i.test(msg);
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
  const { isConnected, status, chainId } = useAccount();
  const { connectAsync, connectors, isPending, reset } = useConnect();
  const { disconnectAsync, isPending: isDisconnecting } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const [busyLocal, setBusyLocal] = useState(false);
  /** Avoid SSR/client mismatch while wagmi restores a session. */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const connector = pickConnector(connectors);
  const reconnecting = status === "connecting" || status === "reconnecting";
  const busy =
    busyLocal ||
    isLoading ||
    isPending ||
    isDisconnecting ||
    isSwitching ||
    (mounted && reconnecting);

  const wrongNetwork = mounted && isConnected && chainId !== arcTestnet.id;

  const connectWallet = async () => {
    if (!connector) {
      toast.error("No browser wallet found. Install MetaMask or another injected wallet.");
      return;
    }

    setBusyLocal(true);
    reset();
    try {
      await connectAsync({ connector, chainId: arcTestnet.id });
      toast.success("Wallet connected");
    } catch (err) {
      if (shouldRetryConnect(err)) {
        try {
          await disconnectAsync().catch(() => undefined);
          reset();
          await connectAsync({ connector, chainId: arcTestnet.id });
          toast.success("Wallet connected");
          return;
        } catch (retryErr) {
          toast.error(retryErr instanceof Error ? retryErr.message : "Failed to connect");
          return;
        }
      }
      toast.error(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setBusyLocal(false);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    if (wrongNetwork) {
      void switchChainAsync({ chainId: arcTestnet.id }).catch(err => {
        toast.error(err instanceof Error ? err.message : "Network switch failed");
      });
      onClick?.(e);
      return;
    }

    void connectWallet();
    onClick?.(e);
  };

  // Stable first paint: always "Connect" until mounted so SSR matches hydration.
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
      disabled={busy || (!connector && !wrongNetwork)}
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
