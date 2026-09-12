"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../common/Tabs";
import CoinCard from "../home/DiscoverCoins/CoinCard";
import ActiveTokenCard from "./ActiveTokenCard";
import UpcomingToken from "./UpcomingToken";
import { TokenGridSkeleton } from "~~/components/common/TokenSkeleton";
import { useApiTokens } from "~~/hooks/useApiTokens";
import { apiToCultToken } from "~~/lib/tokens/adapters";
import { cn } from "~~/lib/utils";
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

  const [graduatedFilter, setGraduatedFilter] = useState<"all" | "active" | "inactive">("all");
  const inactiveGraduatedCount = graduated.filter(t => t.inactive).length;
  const activeGraduatedCount = graduated.length - inactiveGraduatedCount;

  const displayedGraduated = graduated.filter(t => {
    if (graduatedFilter === "active") return !t.inactive;
    if (graduatedFilter === "inactive") return Boolean(t.inactive);
    return true;
  });

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
              {loading ? "" : `${active.length} tokens`}
            </span>
          </div>
          <div className="rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/[0.08] p-[1.5rem]">
            <p className="mb-[0.5rem] font-medium text-emerald-300">Live on DEX</p>
            <p className="text-[1.2rem] text-white/70">
              Listed tokens with vault-locked LP that are still active — trade via DexRouter.
            </p>
          </div>
          {loading ? (
            <TokenGridSkeleton count={6} variant="wide" />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-[1.6rem] sm:grid-cols-2 lg:grid-cols-3">
                {active.map(token => (
                  <ActiveTokenCard key={token.address} token={token} />
                ))}
              </div>
              {active.length === 0 && (
                <div className="py-[4rem] text-center">
                  <p className="text-[1.2rem] text-white/60">
                    No active listed pools yet. Graduate a bonding token to see it here.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="bonding">
        <div className="space-y-[2.4rem]">
          <div className="flex items-center justify-between">
            <h2 className="text-[1.8rem] font-bold text-white sm:text-[2.4rem]">Bonding curve</h2>
            <span className="text-[1rem] text-white/60">
              {loading ? "" : `${bonding.length} tokens`}
            </span>
          </div>
          <div className="mb-[2rem] rounded-lg border border-accent-500/20 bg-accent-500/10 p-[1.5rem]">
            <p className="mb-[0.5rem] font-medium text-accent-500">Trade on the curve</p>
            <p className="text-[0.9rem] text-white/80">
              Progress toward the graduation target. When locked, launch the pool from the token page.
            </p>
          </div>
          {loading ? (
            <TokenGridSkeleton count={6} variant="wide" />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-[1.6rem] sm:grid-cols-2 lg:grid-cols-3">
                {bonding.map(token => (
                  <CoinCard className="mx-auto" key={token.id} token={token} stage="Prebuy" />
                ))}
              </div>
              {bonding.length === 0 && (
                <div className="py-[4rem] text-center">
                  <p className="text-[1.2rem] text-white/60">No bonding tokens yet. Launch one to get started.</p>
                </div>
              )}
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="graduated">
        <div className="space-y-[2.4rem]">
          <div className="flex flex-wrap items-center justify-between gap-[1rem]">
            <h2 className="text-[1.8rem] font-bold text-white sm:text-[2.4rem]">Graduated pools</h2>
            <div className="flex items-center gap-[0.8rem] text-[1.1rem]">
              <span className="text-white/60">
                {loading ? "" : `${graduated.length} total`}
              </span>
              {inactiveGraduatedCount > 0 && !loading && (
                <span className="rounded-full border border-orange-500/35 bg-orange-500/15 px-[0.7rem] py-[0.15rem] text-[1rem] font-medium text-orange-400">
                  {inactiveGraduatedCount} inactive
                </span>
              )}
            </div>
          </div>
          <div className="mb-[2rem] rounded-lg border border-green-500/20 bg-green-500/10 p-[1.5rem]">
            <p className="mb-[0.5rem] font-medium text-green-400">DEX trading & LP Vault</p>
            <p className="text-[0.9rem] text-white/80">
              Graduated tokens trade via the router. LP sits in the recycling vault. Inactive pools with low volume display an Inactive tag and become eligible for community LP recycling.
            </p>
          </div>

          {!loading && graduated.length > 0 && (
            <div className="flex flex-wrap items-center gap-[0.6rem]">
              <button
                type="button"
                onClick={() => setGraduatedFilter("all")}
                className={cn(
                  "rounded-full px-[1.2rem] py-[0.45rem] text-[1.15rem] font-medium transition",
                  graduatedFilter === "all"
                    ? "bg-white/15 text-white"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80",
                )}
              >
                All ({graduated.length})
              </button>
              <button
                type="button"
                onClick={() => setGraduatedFilter("active")}
                className={cn(
                  "rounded-full px-[1.2rem] py-[0.45rem] text-[1.15rem] font-medium transition",
                  graduatedFilter === "active"
                    ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80",
                )}
              >
                Active ({activeGraduatedCount})
              </button>
              <button
                type="button"
                onClick={() => setGraduatedFilter("inactive")}
                className={cn(
                  "rounded-full px-[1.2rem] py-[0.45rem] text-[1.15rem] font-medium transition",
                  graduatedFilter === "inactive"
                    ? "border border-orange-500/30 bg-orange-500/20 text-orange-300"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80",
                )}
              >
                Inactive ({inactiveGraduatedCount})
              </button>
            </div>
          )}

          {loading ? (
            <TokenGridSkeleton count={6} variant="wide" />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-[1.6rem] sm:grid-cols-2 lg:grid-cols-3">
                {displayedGraduated.map(token => (
                  <CoinCard className="mx-auto" key={token.id} token={token} stage="Live" />
                ))}
              </div>
              {displayedGraduated.length === 0 && (
                <div className="py-[4rem] text-center">
                  <p className="text-[1.2rem] text-white/60">
                    {graduatedFilter === "inactive"
                      ? "No inactive graduated tokens right now"
                      : graduatedFilter === "active"
                      ? "No active graduated tokens right now"
                      : "No graduated tokens yet"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="inactive">
        <div className="space-y-[2.4rem]">
          <div className="flex items-center justify-between">
            <h2 className="text-[1.8rem] font-bold text-white sm:text-[2.4rem]">Inactive / eligible</h2>
            <span className="text-[1rem] text-white/60">{loading ? "" : `${inactive.length} tokens`}</span>
          </div>
          <div className="mb-[2rem] rounded-lg border border-orange-500/20 bg-orange-500/10 p-[1.5rem]">
            <p className="mb-[0.5rem] font-medium text-orange-300">Ready to recycle</p>
            <p className="text-[0.9rem] text-white/80">
              Open a token to propose recycling its LP into healthier listed projects.
            </p>
          </div>
          {loading ? (
            <TokenGridSkeleton count={6} variant="wide" />
          ) : (
            <>
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
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="voting">
        <div className="space-y-[2.4rem]">
          <div className="flex items-center justify-between">
            <h2 className="text-[1.8rem] font-bold text-white sm:text-[2.4rem]">Active votes</h2>
            <span className="text-[1rem] text-white/60">{loading ? "" : `${voting.length} proposals`}</span>
          </div>
          <div className="mb-[2rem] rounded-lg border border-accent-500/20 bg-accent-500/10 p-[1.5rem]">
            <p className="mb-[0.5rem] font-medium text-accent-500">Stake USDC to vote</p>
            <p className="text-[0.9rem] text-white/80">
              Vote which listed token receives recycled liquidity, then execute when the proposal succeeds.
            </p>
          </div>
          {loading ? (
            <TokenGridSkeleton count={6} variant="wide" />
          ) : (
            <>
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
            </>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default TokensTab;
