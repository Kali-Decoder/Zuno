"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { arcTestnet } from "~~/config/chains";
import { ZERO } from "~~/lib/reflow/format";
import { getFreshPublicProvider } from "~~/lib/reflow/provider";

/** Privy + wagmi helper for contract writes (ethers signer). */
export function useReflowWallet() {
  const { ready: privyReady, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nativeBalance, setNativeBalance] = useState(ZERO);

  const account = (address || "") as string;
  const isCorrectNetwork = chainId === arcTestnet.id;
  const explorerBase = arcTestnet.blockExplorers?.default.url ?? "https://testnet.arcscan.app";
  const ready =
    privyReady && status !== "connecting" && status !== "reconnecting";

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
    try {
      login();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open login");
    }
  }, [login]);

  const switchToArc = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: arcTestnet.id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Network switch failed.");
    }
  }, [switchChainAsync]);

  /** @deprecated Use switchToArc */
  const switchToMonad = switchToArc;

  const getProvider = useCallback(async () => {
    const active =
      wallets.find(w => w.address?.toLowerCase() === account.toLowerCase()) ?? wallets[0];
    if (active) {
      const eip1193 = await active.getEthereumProvider();
      return new ethers.BrowserProvider(eip1193);
    }
    const ethereum = (globalThis as { ethereum?: ethers.Eip1193Provider }).ethereum;
    if (!ethereum) throw new Error("No wallet provider found.");
    return new ethers.BrowserProvider(ethereum);
  }, [wallets, account]);

  const runWrite = useCallback(
    async (fn: (signer: ethers.Signer) => Promise<void>) => {
      if (!ready) {
        toast.error("Wallet not ready.");
        return false;
      }
      if (!authenticated || !isConnected || !account) {
        toast.error("Connect your wallet first.");
        await connectWallet();
        return false;
      }
      if (!isCorrectNetwork) {
        toast.error(`Switch to ${arcTestnet.name}.`);
        await switchToArc();
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
      authenticated,
      isConnected,
      account,
      isCorrectNetwork,
      getProvider,
      refreshBalance,
      connectWallet,
      switchToArc,
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
    isConnected: Boolean(authenticated && isConnected && account),
    isCorrectNetwork,
    isSubmitting,
    explorerBase,
    connectWallet,
    switchToArc,
    switchToMonad,
    getProvider,
    runWrite,
    refreshBalance,
  };
}
