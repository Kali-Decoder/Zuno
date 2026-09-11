"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useAccount, useChainId } from "wagmi";
import { monadTestnet } from "~~/config/chains";

type AuthContextType = {
  isNewUser: boolean;
  /** Connected wallet address, or null */
  user: { wallet?: { address?: string } } | null;
  address: `0x${string}` | undefined;
  ready: boolean;
  isLoading: boolean;
  isConnected: boolean;
  isValidChain: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();

  const ready = status !== "connecting" && status !== "reconnecting";
  const isValidChain = useMemo(() => {
    if (!isConnected) return true;
    return chainId === monadTestnet.id;
  }, [chainId, isConnected]);

  const user = address ? { wallet: { address } } : null;

  return (
    <AuthContext.Provider
      value={{
        isNewUser: false,
        user,
        address,
        ready,
        isLoading: !ready,
        isConnected: Boolean(isConnected && address),
        isValidChain,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
