"use client";

import { MOCK_ADDRESS, MOCK_CHAIN_ID } from "./constants";

const mockChain = { id: MOCK_CHAIN_ID, name: "Monad Testnet", nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 } };

export type Config = Record<string, unknown>;

export function http(_url?: string) {
  return { type: "http" as const };
}

export function createConfig(_config?: unknown) {
  return { chains: [mockChain], transports: {} };
}

export function useAccount() {
  return {
    address: MOCK_ADDRESS as `0x${string}`,
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    chain: mockChain,
    chainId: MOCK_CHAIN_ID,
    status: "connected" as const,
  };
}

export function useBalance(_args?: unknown) {
  return {
    data: {
      decimals: 18,
      formatted: "42.50",
      symbol: "MON",
      value: 42500000000000000000n,
    },
    isLoading: false,
    refetch: async () => ({}),
  };
}

export function useSwitchChain(_args?: unknown) {
  const switchChain = async (_params?: { chainId: number }) => mockChain;
  return {
    switchChain,
    switchChainAsync: switchChain,
    isPending: false,
    chains: [mockChain],
  };
}

export function useContractRead(_args?: unknown) {
  return { data: 0n, isLoading: false, refetch: async () => ({}), error: null };
}

export function useContractReads(_args?: unknown) {
  return { data: [], isLoading: false, refetch: async () => ({}), error: null };
}

export function useReadContract(_args?: unknown) {
  return { data: undefined, isLoading: false, refetch: async () => ({}), error: null };
}

export function useWriteContract(_args?: unknown) {
  return {
    writeContract: () => undefined,
    writeContractAsync: async () => "0xmocktxhash" as `0x${string}`,
    data: undefined,
    isPending: false,
    error: null,
  };
}

export function usePublicClient() {
  return null;
}

export function useWalletClient() {
  return { data: null, isLoading: false };
}

export function useBlockNumber() {
  return { data: 1n, isLoading: false };
}

export function useWatchContractEvent(_args?: unknown) {
  return { unwatch: () => undefined };
}

export function useEnsName(_args?: unknown) {
  return { data: null, isLoading: false };
}

export function useEnsAvatar(_args?: unknown) {
  return { data: null, isLoading: false };
}

export function useEnsAddress(_args?: unknown) {
  return { data: null, isLoading: false };
}

export type UseBalanceParameters = Record<string, unknown>;
export type UsePublicClientReturnType = null;
export type UseReadContractParameters = Record<string, unknown>;
export type UseWatchContractEventParameters = Record<string, unknown>;
export type UseWriteContractParameters = Record<string, unknown>;
