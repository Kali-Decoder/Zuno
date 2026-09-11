import { zeroAddress } from "viem";
import { create } from "zustand";
import { CultTokenPageData, TokenMetadata } from "~~/types/types";

interface TokenState {
  tokenAddress: `0x${string}`;
  userAddress: `0x${string}`;
  metadata: TokenMetadata | null;
  subgraphData: CultTokenPageData | undefined;
  isLoading: boolean;
  error: Error | null; // Type the error if needed
  refetch: (() => void) | null; // Store the refetch function
  /** Bumped after trades so chart / trades / hero can reload without remounting. */
  dataEpoch: number;

  setTokenAddress: (address: `0x${string}` | undefined) => void;
  setUserAddress: (address: `0x${string}` | undefined) => void;
  setMetadata: (metadata: TokenMetadata | null) => void;
  setSubgraphData: (data: CultTokenPageData | undefined) => void;
  setStateFromSubgraph: (
    accountAddress: `0x${string}`,
    tokenAddress: `0x${string}`,
    metadata: TokenMetadata,
    subgraphData: CultTokenPageData,
    refetchFn?: () => void,
  ) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: any) => void; // Or setError: (error: Error | null) => void
  setRefetch: (refetchFn: () => void) => void;
  bumpDataEpoch: () => void;
}

export const useTokenStore = create<TokenState>(set => ({
  // Use zeroAddress for valid 0x addresses
  tokenAddress: zeroAddress,
  userAddress: zeroAddress,
  metadata: null,
  subgraphData: undefined,
  isLoading: false,
  error: null,
  refetch: null,
  dataEpoch: 0,

  setTokenAddress: address =>
    set(state => {
      const next = address ?? zeroAddress;
      return state.tokenAddress === next ? state : { tokenAddress: next };
    }),

  setUserAddress: address =>
    set(state => {
      const next = address ?? zeroAddress;
      return state.userAddress === next ? state : { userAddress: next };
    }),

  setMetadata: metadata =>
    set(state => {
      if (
        state.metadata?.tokenAddress === metadata?.tokenAddress &&
        state.metadata?.symbol === metadata?.symbol &&
        state.metadata?.name === metadata?.name &&
        state.metadata?.image === metadata?.image
      ) {
        return state;
      }
      return { metadata };
    }),

  setSubgraphData: data => set({ subgraphData: data }),

  setLoading: loading => set({ isLoading: loading }),

  setError: error => set({ error }),

  setRefetch: refetchFn => set({ refetch: refetchFn }),

  bumpDataEpoch: () => set(state => ({ dataEpoch: state.dataEpoch + 1 })),

  setStateFromSubgraph(accountAddress, tokenAddress, metadata, subgraphData, refetchFn) {
    set(state => ({
      ...state,
      userAddress: accountAddress,
      tokenAddress,
      metadata,
      subgraphData,
      isLoading: false,
      refetch: refetchFn,
    }));
  },
}));
