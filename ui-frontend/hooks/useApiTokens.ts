"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  /** When true, kick off chain→Mongo sync in the background (does not block first paint). */
  sync?: boolean;
};

async function loadFromSubgraph(options: Options): Promise<ApiToken[]> {
  if (!isSubgraphConfigured()) return [];
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

async function loadFromApi(options: Options): Promise<ApiToken[]> {
  const params = new URLSearchParams();
  if (options.graduated !== undefined) params.set("graduated", String(options.graduated));
  if (options.phase) params.set("phase", options.phase);
  if (options.inactive !== undefined) params.set("inactive", String(options.inactive));
  if (options.recyclingEligible !== undefined) {
    params.set("recyclingEligible", String(options.recyclingEligible));
  }
  const qs = params.toString();
  const res = await fetch(`/api/tokens${qs ? `?${qs}` : ""}`);
  const data = await res.json();
  return (data.tokens || []) as ApiToken[];
}

async function loadFromChain(options: Options): Promise<ApiToken[]> {
  if (options.graduated === true) return [];
  if (options.phase === "inactive" || options.phase === "voting") return [];
  if (options.inactive === true) return [];
  try {
    const chain = await Promise.race([
      loadCreateEvents(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8_000)),
    ]);
    return chain.map(t => ({
      address: t.address,
      name: t.name,
      symbol: t.symbol,
      curve: t.curve,
      imageUrl: "/zuno-logo.png",
      graduated: false,
      phase: "bonding" as const,
      progress: 0,
      createdAt: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export function useApiTokens(options: Options = {}) {
  const { graduated, phase, inactive, recyclingEligible, sync = false } = options;
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncMeta, setSyncMeta] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const syncOnce = useRef(false);

  const reload = useCallback(
    async (opts?: { forceSync?: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        // Fast path: subgraph → Mongo → short chain lookback. Never block on full sync.
        let list = await loadFromSubgraph({ graduated, phase, inactive, recyclingEligible });
        let source = list.length ? "subgraph" : null;

        if (!list.length) {
          list = await loadFromApi({ graduated, phase, inactive, recyclingEligible });
          if (list.length) source = "mongo";
        }

        if (!list.length) {
          list = await loadFromChain({ graduated, phase, inactive, recyclingEligible });
          if (list.length) source = "chain";
        }

        setTokens(list);
        setSyncMeta(source);

        // Background sync (optional) — refresh list when it finishes
        const shouldSync = opts?.forceSync || (sync && !syncOnce.current);
        if (shouldSync) {
          syncOnce.current = true;
          setSyncing(true);
          void triggerChainSync()
            .then(async ok => {
              if (!ok) return;
              const refreshed = await loadFromApi({ graduated, phase, inactive, recyclingEligible });
              if (refreshed.length) {
                setTokens(refreshed);
                setSyncMeta("synced");
              }
            })
            .finally(() => setSyncing(false));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load tokens");
        setTokens([]);
      } finally {
        setLoading(false);
      }
    },
    [graduated, phase, inactive, recyclingEligible, sync],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tokens, loading, error, reload, syncMeta, syncing };
}

export async function fetchApiToken(address: string): Promise<ApiToken | null> {
  try {
    if (isSubgraphConfigured()) {
      const sg = await fetchSubgraphToken(address);
      if (sg) return subgraphTokenToApi(sg) as ApiToken;
    }

    const res = await fetch(`/api/tokens?address=${encodeURIComponent(address)}`);
    const data = await res.json();
    if (data.token) return data.token as ApiToken;

    const chain = await loadCreateEvents();
    const onChain = chain.find(t => t.address.toLowerCase() === address.toLowerCase());
    if (!onChain) return null;
    return {
      address: onChain.address,
      name: onChain.name,
      symbol: onChain.symbol,
      curve: onChain.curve,
      imageUrl: "/zuno-logo.png",
      graduated: false,
      phase: "bonding",
      progress: 0,
    };
  } catch {
    return null;
  }
}
