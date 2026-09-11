"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../common/Tabs";
import CoinCard from "../home/DiscoverCoins/CoinCard";
import ActiveTokenCard from "./ActiveTokenCard";
import UpcomingToken from "./UpcomingToken";
import { useApiTokens } from "~~/hooks/useApiTokens";
import { apiToCultToken } from "~~/lib/tokens/adapters";
import { StarIcon, TrophyOutlineIcon, ZapIcon } from "~~/icons/symbols";

function isActiveListed(t: {
  graduated?: boolean;
  isListing?: boolean;
  inactive?: boolean;
  phase?: string;
}) {
  const listed = Boolean(t.graduated || t.isListing || t.phase === "listed");
  if (!listed) return false;
  if (t.inactive || t.phase === "inactive") return false;
  if (t.phase === "voting" || t.phase === "recycling" || t.phase === "recycled") return false;
  return true;
}

const triggerClass =
  "group flex w-fit items-center justify-start gap-[0.4rem] rounded-full border border-transparent bg-white/5 px-[1.2rem] leading-tight sm:w-full sm:gap-[0.8rem] sm:rounded-sm sm:bg-transparent sm:p-[1.2rem] sm:data-[state=active]:border-white/20 sm:data-[state=active]:bg-transparent";

const TokensTab = () => {
  const { tokens: all, loading } = useApiTokens({ sync: true });
  const cult = all.map(apiToCultToken);

  const bonding = cult.filter(t => !t.isGraduated);
  const graduated = cult.filter(t => t.isGraduated);
  const active = all.filter(isActiveListed);
  const inactive = all.filter(t => t.phase === "inactive" || t.inactive);
  const voting = all.filter(t => t.phase === "voting" || t.proposal?.state === "Active");

  return (
    <Tabs defaultValue="active" className="grid w-full grid-cols-1 gap-[1.6rem] sm:grid-cols-[20%_1fr]">
      <aside className="h-full rounded-0 border-b border-b-white/10 pb-[0.8rem] sm:min-h-[60vh] sm:rounded-md sm:border-0 sm:bg-white/5 sm:p-[2.4rem]">
        <TabsList className="flex w-full justify-start gap-[0.8rem] bg-transparent p-0 sm:flex-col">
          <TabsTrigger value="active" className={triggerClass}>
            <ZapIcon className="w-[1rem] text-emerald-400 group-data-[state=active]:text-accent-500 sm:w-[1.4rem]" />
            <span>Active</span>
          </TabsTrigger>
          <TabsTrigger value="bonding" className={triggerClass}>
            <StarIcon className="w-[1rem] group-data-[state=active]:fill-accent-500 sm:w-[1.4rem]" />
            <span>Bonding</span>
          </TabsTrigger>
          <TabsTrigger value="graduated" className={triggerClass}>
            <TrophyOutlineIcon className="w-[1rem] group-data-[state=active]:text-accent-500 sm:w-[1.4rem]" />
            <span>Graduated</span>
          </TabsTrigger>
          <TabsTrigger value="inactive" className={triggerClass}>
            <ZapIcon className="w-[1rem] group-data-[state=active]:text-accent-500 sm:w-[1.4rem]" />
            <span>Inactive</span>
          </TabsTrigger>
          <TabsTrigger value="voting" className={triggerClass}>
            <ZapIcon className="w-[1rem] group-data-[state=active]:text-accent-500 sm:w-[1.4rem]" />
            <span>Voting</span>
          </TabsTrigger>
        </TabsList>
      </aside>

      <TabsContent value="active">
        <div className="space-y-[2.4rem]">
          <div className="flex items-center justify-between">
            <h2 className="text-[1.8rem] font-bold text-white sm:text-[2.4rem]">Active pools</h2>
            <span className="text-[1rem] text-white/60">
              {loading ? "…" : `${active.length} tokens`}
            </span>
          </div>
          <div className="rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/[0.08] p-[1.5rem]">
            <p className="mb-[0.5rem] font-medium text-emerald-300">Live on DEX</p>
            <p className="text-[1.2rem] text-white/70">
              Listed tokens with vault-locked LP that are still active — trade via DexRouter.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-[1.6rem] sm:grid-cols-2 lg:grid-cols-3">
            {active.map(token => (
              <ActiveTokenCard key={token.address} token={token} />
            ))}
          </div>
          {active.length === 0 && (
            <div className="py-[4rem] text-center">
              <p className="text-[1.2rem] text-white/60">
                {loading ? "Loading…" : "No active listed pools yet. Graduate a bonding token to see it here."}
              </p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="bonding">
        <div className="space-y-[2.4rem]">
          <div className="flex items-center justify-between">
            <h2 className="text-[1.8rem] font-bold text-white sm:text-[2.4rem]">Bonding curve</h2>
            <span className="text-[1rem] text-white/60">
              {loading ? "…" : `${bonding.length} tokens`}
            </span>
          </div>
          <div className="mb-[2rem] rounded-lg border border-accent-500/20 bg-accent-500/10 p-[1.5rem]">
            <p className="mb-[0.5rem] font-medium text-accent-500">Trade on the curve</p>
            <p className="text-[0.9rem] text-white/80">
              Progress toward the graduation target. When locked, launch the pool from the token page.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-[1.6rem] sm:grid-cols-2 lg:grid-cols-3">
            {bonding.map(token => (
              <CoinCard className="mx-auto" key={token.id} token={token} stage="Prebuy" />
            ))}
          </div>
          {bonding.length === 0 && (
            <div className="py-[4rem] text-center">
              <p className="text-[1.2rem] text-white/60">
                {loading ? "Loading…" : "No bonding tokens yet. Launch one to get started."}
              </p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="graduated">
        <div className="space-y-[2.4rem]">
          <div className="flex items-center justify-between">
            <h2 className="text-[1.8rem] font-bold text-white sm:text-[2.4rem]">Live pools</h2>
            <span className="text-[1rem] text-white/60">{graduated.length} tokens</span>
          </div>
          <div className="mb-[2rem] rounded-lg border border-green-500/20 bg-green-500/10 p-[1.5rem]">
            <p className="mb-[0.5rem] font-medium text-green-400">DEX trading</p>
            <p className="text-[0.9rem] text-white/80">
              Graduated tokens trade via the router. LP sits in the recycling vault.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-[1.6rem] sm:grid-cols-2 lg:grid-cols-3">
            {graduated.map(token => (
              <CoinCard className="mx-auto" key={token.id} token={token} stage="Live" />
            ))}
          </div>
          {graduated.length === 0 && (
            <div className="py-[4rem] text-center">
              <p className="text-[1.2rem] text-white/60">No graduated tokens yet</p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="inactive">
        <div className="space-y-[2.4rem]">
          <div className="flex items-center justify-between">
            <h2 className="text-[1.8rem] font-bold text-white sm:text-[2.4rem]">Inactive / eligible</h2>
            <span className="text-[1rem] text-white/60">{inactive.length} tokens</span>
          </div>
          <div className="mb-[2rem] rounded-lg border border-orange-500/20 bg-orange-500/10 p-[1.5rem]">
            <p className="mb-[0.5rem] font-medium text-orange-300">Ready to recycle</p>
            <p className="text-[0.9rem] text-white/80">
              Open a token to propose recycling its LP into healthier listed projects.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-[1.6rem] sm:grid-cols-2 lg:grid-cols-3">
            {inactive.map(t => (
              <UpcomingToken
                key={t.address}
                className="w-auto sm:w-auto"
                name={t.name}
                symbol={t.symbol}
                href={`/token/${t.address}`}
                imageUrl={t.imageUrl}
                subtitle="Inactive · propose recycle"
              />
            ))}
          </div>
          {inactive.length === 0 && (
            <div className="py-[4rem] text-center">
              <p className="text-[1.2rem] text-white/60">No inactive tokens right now</p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="voting">
        <div className="space-y-[2.4rem]">
          <div className="flex items-center justify-between">
            <h2 className="text-[1.8rem] font-bold text-white sm:text-[2.4rem]">Active votes</h2>
            <span className="text-[1rem] text-white/60">{voting.length} proposals</span>
          </div>
          <div className="mb-[2rem] rounded-lg border border-accent-500/20 bg-accent-500/10 p-[1.5rem]">
            <p className="mb-[0.5rem] font-medium text-accent-500">Stake MON to vote</p>
            <p className="text-[0.9rem] text-white/80">
              Vote which listed token receives recycled liquidity, then execute when the proposal succeeds.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-[1.6rem] sm:grid-cols-2 lg:grid-cols-3">
            {voting.map(t => (
              <UpcomingToken
                key={t.address}
                className="w-auto sm:w-auto"
                name={t.name}
                symbol={t.symbol}
                href={`/token/${t.address}`}
                imageUrl={t.imageUrl}
                subtitle={`Proposal #${t.proposal?.id ?? "—"} · ${t.proposal?.state || "Active"}`}
              />
            ))}
          </div>
          {voting.length === 0 && (
            <div className="py-[4rem] text-center">
              <p className="text-[1.2rem] text-white/60">No active recycling votes</p>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default TokensTab;
