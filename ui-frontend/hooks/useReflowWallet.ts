"use client";

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import {
  ConnectorAlreadyConnectedError,
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { monadTestnet } from "~~/config/chains";
import { ZERO } from "~~/lib/reflow/format";
import { getFreshPublicProvider } from "~~/lib/reflow/provider";

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

/** Wagmi injected wallet helper for contract writes (ethers signer). */
export function useReflowWallet() {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors, reset } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nativeBalance, setNativeBalance] = useState(ZERO);

  const account = (address || "") as string;
  const isCorrectNetwork = chainId === monadTestnet.id;
  const explorerBase = monadTestnet.blockExplorers?.default.url ?? "https://testnet.monadvision.com";
  const ready = status !== "connecting" && status !== "reconnecting";

  const refreshBalance = useCallback(
    async (addr = account) => {
      if (!addr) {
        setNativeBalance(ZERO);
        return;
      }
      try {
        const provider = getFreshPublicProvider();
        setNativeBalance(await provider.getBalance(addr));
      } catch {
        setNativeBalance(ZERO);
      }
    },
    [account],
  );

  const connectWallet = useCallback(async () => {
    const connector = pickConnector(connectors);
    if (!connector) {
      toast.error("No browser wallet found.");
      return;
    }
    reset();
    try {
      await connectAsync({ connector, chainId: monadTestnet.id });
    } catch (err) {
      if (shouldRetryConnect(err)) {
        try {
          await disconnectAsync().catch(() => undefined);
          reset();
          await connectAsync({ connector, chainId: monadTestnet.id });
          return;
        } catch (retryErr) {
          toast.error(retryErr instanceof Error ? retryErr.message : "Failed to connect");
          return;
        }
      }
      toast.error(err instanceof Error ? err.message : "Failed to connect");
    }
  }, [connectors, connectAsync, disconnectAsync, reset]);

  const switchToMonad = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: monadTestnet.id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Network switch failed.");
    }
  }, [switchChainAsync]);

  const getProvider = useCallback(async () => {
    const ethereum = (globalThis as { ethereum?: ethers.Eip1193Provider }).ethereum;
    if (!ethereum) throw new Error("No browser wallet found.");
    return new ethers.BrowserProvider(ethereum);
  }, []);

  const runWrite = useCallback(
    async (fn: (signer: ethers.Signer) => Promise<void>) => {
      if (!ready) {
        toast.error("Wallet not ready.");
        return false;
      }
      if (!isConnected || !account) {
        toast.error("Connect your wallet first.");
        await connectWallet();
        return false;
      }
      if (!isCorrectNetwork) {
        toast.error(`Switch to ${monadTestnet.name}.`);
        await switchToMonad();
        return false;
      }

      setIsSubmitting(true);
      try {
        const provider = await getProvider();
        const signer = await provider.getSigner();
        await fn(signer);
        await refreshBalance(account);
        return true;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      ready,
      isConnected,
      account,
      isCorrectNetwork,
      getProvider,
      refreshBalance,
      connectWallet,
      switchToMonad,
    ],
  );

  useEffect(() => {
    if (!account) {
      setNativeBalance(ZERO);
      return;
    }
    void refreshBalance(account);
    const timer = setInterval(() => void refreshBalance(account), 12000);
    return () => clearInterval(timer);
  }, [account, chainId, refreshBalance]);

  return {
    account,
    chainId,
    nativeBalance,
    isConnected: Boolean(isConnected && account),
    isCorrectNetwork,
    isSubmitting,
    explorerBase,
    connectWallet,
    switchToMonad,
    getProvider,
    runWrite,
    refreshBalance,
  };
}
