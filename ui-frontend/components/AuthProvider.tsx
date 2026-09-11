"use client";

import React, { createContext, useContext, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useChainId } from "wagmi";
import { monadTestnet } from "~~/config/chains";
import { isPrivyConfigured } from "~~/lib/privy";

type AuthContextType = {
  isNewUser: boolean;
  user: any;
  ready: boolean;
  isLoading: boolean;
  isValidChain: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthInner({ children, ready, user }: { children: React.ReactNode; ready: boolean; user: any }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  const isValidChain = useMemo(() => {
    if (!isConnected && !user?.wallet?.address) return true;
    return chainId === monadTestnet.id;
  }, [chainId, isConnected, user?.wallet?.address]);

  return (
    <AuthContext.Provider
      value={{
        isNewUser: false,
        user,
        ready,
        isLoading: !ready,
        isValidChain,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function AuthWithPrivy({ children }: { children: React.ReactNode }) {
  const { ready, user } = usePrivy();
  return (
    <AuthInner ready={ready} user={user}>
      {children}
    </AuthInner>
  );
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  if (!isPrivyConfigured) {
    return (
      <AuthInner ready={true} user={null}>
        {children}
      </AuthInner>
    );
  }
  return <AuthWithPrivy>{children}</AuthWithPrivy>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
