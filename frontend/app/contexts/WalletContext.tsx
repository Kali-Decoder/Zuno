"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useWallet } from "@/app/hooks/useWallet";

type WalletValue = ReturnType<typeof useWallet>;

const WalletContext = createContext<WalletValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  return <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>;
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
}
