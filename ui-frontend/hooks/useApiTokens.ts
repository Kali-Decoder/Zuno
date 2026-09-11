"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCreateEvents } from "~~/lib/reflow/actions";
import {
  fetchSubgraphToken,
  fetchSubgraphTokens,
  isSubgraphConfigured,
  subgraphTokenToApi,
} from "~~/lib/subgraph/client";
import { triggerChainSync } from "~~/lib/tokens/adapters";

export type ApiTokenProposal = {
  id: number;
  state?: string;
  candidates?: string[];
  endTime?: string;
  winner?: string;
  executed?: boolean;
};

export type ApiToken = {
  address: string;
  name: string;
  symbol: string;
  curve?: string;
  pair?: string;
  imageUrl?: string;
  description?: string;
  creator?: string;
  graduated?: boolean;
  isListing?: boolean;
  curveLocked?: boolean;
  progress?: number;
  phase?: string;
  vaultStatus?: string;
  inactive?: boolean;
  recyclingEligible?: boolean;
  marketCapUsd?: number;
  volumeUsd?: number;
  priceNative?: number;
  createdAt?: string;
  lastBuyAt?: string;
  listedAt?: string;
  proposal?: ApiTokenProposal | null;
};

type Options = {
  graduated?: boolean;
  phase?: string;
  inactive?: boolean;
  recyclingEligible?: boolean;
  sync?: boolean;
};

async function loadFromSubgraph(options: Options): Promise<ApiToken[]> {
  if (!isSubgraphConfigured()) return [];
  // Lifecycle filters (inactive/voting) live in Mongo only — skip Graph for those.
  if (options.inactive === true) return [];
  if (options.phase && options.phase !== "bonding" && options.phase !== "listed" && options.phase !== "locked") {
    return [];
  }

  const graduated =
    options.graduated === true
      ? true
      : options.graduated === false
        ? false
        : options.phase === "listed"
          ? true
          : options.phase === "bonding" || options.phase === "locked"
            ? false
            : undefined;

  const tokens = await fetchSubgraphTokens({ graduated, first: 100 });
  return tokens.map(subgraphTokenToApi) as ApiToken[];
}

export function useApiTokens(options: Options = {}) {
  const { graduated, phase, inactive, recyclingEligible, sync = true } = options;
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncMeta, setSyncMeta] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (sync) {
        const ok = await triggerChainSync();
        setSyncMeta(ok ? "synced" : "sync-skipped");
      }

      const params = new URLSearchParams();
      if (graduated !== undefined) params.set("graduated", String(graduated));
      if (phase) params.set("phase", phase);
      if (inactive !== undefined) params.set("inactive", String(inactive));
      if (recyclingEligible !== undefined) params.set("recyclingEligible", String(recyclingEligible));

      const qs = params.toString();
      const res = await fetch(`/api/tokens${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      let list: ApiToken[] = data.tokens || [];

      // Fallback: The Graph when Mongo is empty
      if (!list.length) {
        const fromGraph = await loadFromSubgraph({ graduated, phase, inactive, recyclingEligible });
        if (fromGraph.length) {
          list = fromGraph;
          setSyncMeta(prev => (prev ? `${prev}+subgraph` : "subgraph"));
        }
      }

      // Fallback: chain Create events when Graph also empty
      if (!list.length && !data.error) {
        const chain = await loadCreateEvents();
        list = chain.map(t => ({
          address: t.address,
          name: t.name,
          symbol: t.symbol,
          curve: t.curve,
          imageUrl: "/gmonad.jpeg",
          graduated: false,
          phase: "bonding",
          progress: 0,
          createdAt: new Date().toISOString(),
        }));
        if (graduated === true) list = [];
        if (phase === "inactive" || phase === "voting") list = [];
        if (inactive === true) list = [];
      }

      setTokens(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tokens");
      try {
        const fromGraph = await loadFromSubgraph({ graduated, phase, inactive, recyclingEligible });
        if (fromGraph.length) {
          setTokens(fromGraph);
        } else {
          const chain = await loadCreateEvents();
          let list = chain.map(t => ({
            address: t.address,
            name: t.name,
            symbol: t.symbol,
            curve: t.curve,
            imageUrl: "/gmonad.jpeg",
            graduated: false,
            phase: "bonding" as const,
            progress: 0,
          }));
          if (graduated === true) list = [];
          setTokens(list);
        }
      } catch {
        setTokens([]);
      }
    } finally {
      setLoading(false);
    }
  }, [graduated, phase, inactive, recyclingEligible, sync]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tokens, loading, error, reload, syncMeta };
}

export async function fetchApiToken(address: string): Promise<ApiToken | null> {
  try {
    const res = await fetch(`/api/tokens?address=${encodeURIComponent(address)}`);
    const data = await res.json();
    if (data.token) return data.token as ApiToken;

    if (isSubgraphConfigured()) {
      const sg = await fetchSubgraphToken(address);
      if (sg) return subgraphTokenToApi(sg) as ApiToken;
    }

    const chain = await loadCreateEvents();
    const onChain = chain.find(t => t.address.toLowerCase() === address.toLowerCase());
    if (!onChain) return null;
    return {
      address: onChain.address,
      name: onChain.name,
      symbol: onChain.symbol,
      curve: onChain.curve,
      imageUrl: "/gmonad.jpeg",
      graduated: false,
      phase: "bonding",
      progress: 0,
    };
  } catch {
    return null;
  }
}
