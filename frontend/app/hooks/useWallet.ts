"use client";

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { monadTestnet } from "@/app/config/chains";
import { useToastContext } from "@/app/contexts/ToastContext";

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener: (event: string, cb: (...args: unknown[]) => void) => void;
};

export function useWallet() {
  const { showError, showInfo } = useToastContext();
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ethereum =
    typeof window !== "undefined"
      ? ((window as Window & { ethereum?: Eip1193Provider }).ethereum ?? null)
      : null;

  const isConnected = !!account;
  const isCorrectNetwork = chainId === monadTestnet.id;
  const explorerBase = monadTestnet.blockExplorers?.default.url ?? "https://testnet.monadvision.com";

  const connectWallet = useCallback(async () => {
    if (!ethereum) {
      showError("Install MetaMask or another EVM wallet.");
      return;
    }
    try {
      const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (accounts.length > 0) setAccount(accounts[0]);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Wallet connection failed.");
    }
  }, [ethereum, showError]);

  const switchToMonad = useCallback(async () => {
    if (!ethereum) {
      showError("Wallet provider not available.");
      return;
    }
    const chainHex = `0x${monadTestnet.id.toString(16)}`;
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainHex }],
      });
    } catch (switchError) {
      const err = switchError as { code?: number };
      if (err.code !== 4902) {
        showError(switchError instanceof Error ? switchError.message : "Network switch failed.");
        return;
      }
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainHex,
            chainName: monadTestnet.name,
            nativeCurrency: monadTestnet.nativeCurrency,
            rpcUrls: monadTestnet.rpcUrls.default.http,
            blockExplorerUrls: [explorerBase],
          },
        ],
      });
    }
  }, [ethereum, explorerBase, showError]);

  const getProvider = useCallback(() => {
    if (!ethereum) throw new Error("Wallet provider not available.");
    return new ethers.BrowserProvider(ethereum as ethers.Eip1193Provider);
  }, [ethereum]);

  const runWrite = useCallback(
    async (fn: (signer: ethers.Signer) => Promise<void>) => {
      if (!ethereum) {
        showError("Wallet provider not available.");
        return false;
      }
      if (!account) {
        showInfo("Connect wallet first.");
        return false;
      }
      if (!isCorrectNetwork) {
        showError(`Switch wallet network to ${monadTestnet.name} (${monadTestnet.id}).`);
        return false;
      }

      setIsSubmitting(true);
      try {
        const signer = await getProvider().getSigner();
        await fn(signer);
        return true;
      } finally {
        setIsSubmitting(false);
      }
    },
    [account, ethereum, getProvider, isCorrectNetwork, showError, showInfo]
  );

  useEffect(() => {
    if (!ethereum) return;
    const load = async () => {
      try {
        const accounts = (await ethereum.request({ method: "eth_accounts" })) as string[];
        const chainHex = (await ethereum.request({ method: "eth_chainId" })) as string;
        setChainId(Number.parseInt(chainHex, 16));
        setAccount(accounts[0] ?? "");
      } catch {
        showError("Unable to read wallet state.");
      }
    };
    load();

    const onAccountsChanged = (accounts: unknown) => {
      const list = Array.isArray(accounts) ? (accounts as string[]) : [];
      setAccount(list[0] ?? "");
    };
    const onChainChanged = (value: unknown) => {
      const chainHex = typeof value === "string" ? value : "0x0";
      setChainId(Number.parseInt(chainHex, 16));
    };

    ethereum.on("accountsChanged", onAccountsChanged);
    ethereum.on("chainChanged", onChainChanged);
    return () => {
      ethereum.removeListener("accountsChanged", onAccountsChanged);
      ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, [ethereum, showError]);

  return {
    account,
    chainId,
    ethereum,
    isConnected,
    isCorrectNetwork,
    isSubmitting,
    explorerBase,
    connectWallet,
    switchToMonad,
    getProvider,
    runWrite,
  };
}
