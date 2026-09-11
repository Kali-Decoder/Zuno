"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCreateEvents } from "~~/lib/reflow/actions";
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

      // Fallback: chain Create events when Mongo is empty / unavailable
      if ((!list || list.length === 0) && !data.error) {
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
