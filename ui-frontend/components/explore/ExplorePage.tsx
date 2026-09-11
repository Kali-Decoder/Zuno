"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ExploreTokenCard from "./ExploreTokenCard";
import GraduatedSection from "./GraduatedSection";
import { ZunoLoader } from "~~/components/common/ZunoLoader";
import type { ExploreToken } from "~~/constants/exploreTokens";
import { useApiTokens } from "~~/hooks/useApiTokens";
import { getCurveProgress } from "~~/lib/reflow/actions";
import { apiToExploreToken } from "~~/lib/tokens/adapters";
import { cn } from "~~/lib/utils";

const SORTS = [
  { id: "recent", label: "Recent buys" },
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "mcap", label: "Market cap" },
  { id: "volume", label: "Volume" },
] as const;

const WINDOWS = [
  { id: "all", label: "All" },
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
] as const;

const PAGE_SIZE = 25;

type SortId = (typeof SORTS)[number]["id"];
type WindowId = (typeof WINDOWS)[number]["id"];

function parseMc(label: string) {
  const n = parseFloat(label.replace(/[^0-9.]/g, ""));
  if (label.toLowerCase().includes("k")) return n * 1_000;
  if (label.toLowerCase().includes("m")) return n * 1_000_000;
  return n;
}

function sortTokens(list: ExploreToken[], sort: SortId) {
  const next = [...list];
  switch (sort) {
    case "recent":
      return next.sort((a, b) => b.lastBuyAt - a.lastBuyAt);
    case "newest":
      return next.sort((a, b) => b.createdAt - a.createdAt);
    case "oldest":
      return next.sort((a, b) => a.createdAt - b.createdAt);
    case "mcap":
      return next.sort((a, b) => parseMc(b.marketCapLabel) - parseMc(a.marketCapLabel));
    case "volume":
      return next.sort((a, b) => b.volume - a.volume);
    default:
      return next;
  }
}

function filterByWindow(list: ExploreToken[], window: WindowId) {
  if (window === "all") return list;
  const ms = window === "24h" ? 86_400_000 : 7 * 86_400_000;
  const cutoff = Date.now() - ms;
  return list.filter(t => t.lastBuyAt >= cutoff);
}

function pageList(current: number, total: number) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 2) return [1, 2, "...", total] as const;
  if (current >= total - 1) return [1, "...", total - 1, total] as const;
  return [1, "...", current, "...", total] as const;
}

export default function ExplorePage() {
  const { tokens: apiTokens, loading, reload, syncing } = useApiTokens({ graduated: false });
  const [enriched, setEnriched] = useState<ExploreToken[]>([]);
  const [sort, setSort] = useState<SortId>("recent");
  const [window, setWindow] = useState<WindowId>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const base = apiTokens.map(apiToExploreToken);

      // Enrich a slice with live curve progress (cap RPC load)
      const slice = base.slice(0, 40);
      const withProgress = await Promise.all(
        slice.map(async t => {
          try {
            const p = await getCurveProgress(t.id);
            if (p.listed) return null;
            return { ...t, progress: p.progress };
          } catch {
            return t;
          }
        }),
      );
      if (!cancelled) {
        setEnriched(withProgress.filter((t): t is ExploreToken => !!t));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiTokens]);

  const source = enriched.length > 0 ? enriched : apiTokens.map(apiToExploreToken);

  const filtered = useMemo(() => sortTokens(filterByWindow(source, window), sort), [source, sort, window]);

  const totalPages = Math.max(1, Math.ceil(Math.max(filtered.length, 1) / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [sort, window, source.length]);

  const pageTokens = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const pages = pageList(page, totalPages);

  return (
    <div className="page-container pb-[6rem]">
      <GraduatedSection />

      <section className="surface-elevated rounded-[1.6rem] bg-[#141414] p-[1.6rem] sm:p-[2rem] lg:p-[2.4rem]">
        <div className="mb-[1.8rem] flex flex-col gap-[1.6rem] lg:mb-[2.4rem] lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-[0.7rem]">
            <div className="flex flex-wrap items-baseline gap-[1rem]">
              <h2 className="text-[2.8rem] font-bold leading-none text-white sm:text-[3.2rem]">Explore</h2>
              <span className="rounded-full bg-white/10 px-[1rem] py-[0.4rem] text-[1.15rem] text-white/55">
                {filtered.length.toLocaleString()} bonding
              </span>
            </div>
            <p className="max-w-[48rem] text-[1.25rem] text-white/45 sm:text-[1.35rem]">
              Tokens climbing toward graduation on Arc Testnet.
              {loading ? " Loading…" : syncing ? " Syncing…" : ""}
            </p>
            <button
              type="button"
              disabled={loading || syncing}
              onClick={() => {
                void reload({ forceSync: true });
              }}
              className="w-fit rounded-full bg-white/5 px-[1.2rem] py-[0.55rem] text-[1.15rem] text-white/55 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              {syncing ? "Syncing from chain…" : "Sync from chain"}
            </button>
          </div>

          <div className="flex flex-col gap-[1rem] sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="inline-flex max-w-full flex-wrap items-center gap-[0.25rem]">
              {SORTS.map(s => {
                const active = sort === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSort(s.id)}
                    className={cn(
                      "rounded-full px-[1.2rem] py-[0.75rem] text-[1.15rem] font-medium transition-colors sm:text-[1.25rem]",
                      active ? "bg-[#1f1f1f] text-white" : "text-white/45 hover:text-white/80",
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            <div className="surface-elevated-sm inline-flex items-center gap-[0.25rem] rounded-full bg-[#1a1a1a] p-[0.3rem]">
              {WINDOWS.map(w => {
                const active = window === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWindow(w.id)}
                    className={cn(
                      "rounded-full px-[1.1rem] py-[0.6rem] text-[1.15rem] font-medium transition-colors",
                      active ? "bg-[#2a2a2a] text-white" : "text-white/40 hover:text-white/70",
                    )}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[1rem] sm:grid-cols-3 sm:gap-[1.2rem] lg:grid-cols-4 xl:grid-cols-5">
          {pageTokens.map(token => (
            <ExploreTokenCard key={token.id} token={token} />
          ))}
        </div>

        {pageTokens.length === 0 && (
          <div className="grid place-content-center rounded-[1.4rem] bg-[#161616] px-[2rem] py-[6rem]">
            {loading ? (
              <ZunoLoader size="md" label="Loading tokens…" />
            ) : (
              <p className="text-center text-white/40">No bonding tokens yet. Launch one from Launch.</p>
            )}
          </div>
        )}

        {pageTokens.length > 0 && totalPages > 1 && (
          <div className="mt-[2rem] flex justify-center">
            <div className="surface-elevated-sm inline-flex items-center gap-[0.35rem] rounded-full bg-[#161616] px-[0.6rem] py-[0.45rem]">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="grid size-[3rem] place-content-center rounded-full text-white/70 transition-colors hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronLeft className="size-[1.6rem]" />
              </button>

              {pages.map((p, idx) =>
                p === "..." ? (
                  <span key={`e-${idx}`} className="px-[0.6rem] text-[1.2rem] text-white/35">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={cn(
                      "grid size-[3rem] place-content-center rounded-[0.6rem] text-[1.25rem] font-medium transition-colors",
                      page === p ? "bg-white text-black" : "text-white/55 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {p}
                  </button>
                ),
              )}

              <button
                type="button"
                aria-label="Next page"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="grid size-[3rem] place-content-center rounded-full text-white/70 transition-colors hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronRight className="size-[1.6rem]" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
