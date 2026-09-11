"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import TradeInfo from "~~/components/coin/BuyNSell";
import LifecyclePanel from "~~/components/token/LifecyclePanel";
import {
  type TokenDetail,
} from "~~/constants/tokenDetail";
import { fetchApiToken } from "~~/hooks/useApiTokens";
import {
  CHART_TIMEFRAMES,
  derivePhaseFromLifecycle,
  getTokenLifecycle,
  getTokenMarketStats,
  getTokenPriceSeries,
  readErc20Meta,
  type ChartTimeframe,
  type PriceChartPoint,
} from "~~/lib/reflow/actions";
import { smoothAreaPath, smoothLinePath } from "~~/lib/chart/smoothPath";
import { formatCompactMon } from "~~/lib/reflow/format";
import {
  apiToTokenDetail,
  applyMarketStatsToDetail,
  explorerAddressUrl,
  persistTokenPatch,
} from "~~/lib/tokens/adapters";
import { cn } from "~~/lib/utils";
import { useTokenStore } from "~~/stores/tokenStore";
import { shortenAddress } from "~~/utils/addressShort";

const TIMEFRAMES = CHART_TIMEFRAMES;

function PhaseChip({ phase }: { phase: string }) {
  const tone: Record<string, string> = {
    bonding: "bg-accent-500/15 text-accent-500",
    locked: "bg-yellow-500/15 text-yellow-300",
    listed: "bg-emerald-500/15 text-emerald-300",
    inactive: "bg-orange-500/15 text-orange-300",
    voting: "bg-sky-500/15 text-sky-300",
  };
  return (
    <span
      className={cn(
        "rounded-full px-[0.9rem] py-[0.35rem] text-[1.05rem] font-medium capitalize tracking-wide",
        tone[phase] || tone.bonding,
      )}
    >
      {phase}
    </span>
  );
}

function TokenHero({ token }: { token: TokenDetail }) {
  const phase = token.phase || (token.graduated ? "listed" : "bonding");
  const progress = token.progress ?? 0;
  const links = [
    { label: "Contract", href: token.socials.contract || explorerAddressUrl(token.id) },
    token.curve ? { label: "Curve", href: token.socials.curve || explorerAddressUrl(token.curve) } : null,
    token.pair ? { label: "Pool", href: token.socials.pool || explorerAddressUrl(token.pair) } : null,
  ].filter(Boolean) as { label: string; href: string }[];

  const metrics = [
    { label: "Price", value: token.priceLabel && token.priceLabel !== "—" ? token.priceLabel : "—" },
    { label: "Liquidity", value: token.liquidityLabel },
    { label: "Volume", value: token.volume24hLabel },
    {
      label: "Progress",
      value: token.graduated ? "Graduated" : `${progress.toFixed(1)}%`,
    },
  ];

  return (
    <section className="relative mb-[1.6rem] overflow-hidden rounded-[1.8rem] border border-white/[0.06] bg-[#121212]">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 12% 0%, rgba(194,255,44,0.08), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(255,255,255,0.03), transparent 50%)",
        }}
      />

      <div className="relative p-[1.6rem] sm:p-[2.2rem]">
        <div className="flex flex-col gap-[1.8rem] lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-[1.4rem]">
            <div className="relative size-[6.4rem] shrink-0 overflow-hidden rounded-[1.4rem] ring-1 ring-white/10 sm:size-[7.2rem]">
              <Image src={token.imageUrl} alt={token.name} fill className="object-cover" sizes="72px" />
            </div>
            <div className="min-w-0 space-y-[0.7rem]">
              <div className="flex flex-wrap items-center gap-[0.8rem]">
                <h1 className="truncate text-[2.4rem] font-semibold tracking-tight text-white sm:text-[3rem]">
                  {token.name}
                </h1>
                <span className="text-[1.4rem] font-medium text-white/35">${token.symbol}</span>
                <PhaseChip phase={phase} />
              </div>
              <p className="max-w-[42rem] text-[1.25rem] leading-snug text-white/40">{token.description}</p>
              <div className="flex flex-wrap items-center gap-x-[1.2rem] gap-y-[0.4rem] text-[1.15rem] text-white/35">
                <span className="font-mono">{shortenAddress(token.id)}</span>
                {links.map((link, i) => (
                  <span key={link.label} className="inline-flex items-center gap-[1.2rem]">
                    {i === 0 && <span className="text-white/15">·</span>}
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-[0.35rem] text-white/45 transition-colors hover:text-accent-500"
                    >
                      {link.label}
                      <ExternalLink className="size-[1.1rem] opacity-60" />
                    </a>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="shrink-0 lg:text-right">
            <p className="text-[1.15rem] uppercase tracking-[0.08em] text-white/35">Market cap</p>
            <p className="mt-[0.3rem] text-[3.2rem] font-semibold tabular-nums tracking-tight text-white sm:text-[3.6rem]">
              {token.marketCapLabel}
            </p>
            {token.marketCapNative != null && token.marketCapNative > 0 && (
              <p className="mt-[0.2rem] text-[1.2rem] text-white/35">
                {formatCompactMon(token.marketCapNative)} FDV
              </p>
            )}
          </div>
        </div>

        {!token.graduated && (
          <div className="mt-[1.8rem]">
            <div className="mb-[0.55rem] flex items-center justify-between text-[1.15rem]">
              <span className="text-white/40">Graduation</span>
              <span className="tabular-nums text-accent-500">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-[0.35rem] overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-accent-500 transition-[width] duration-500"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-[1.8rem] grid grid-cols-2 gap-[1rem] border-t border-white/[0.06] pt-[1.6rem] sm:grid-cols-4">
          {metrics.map(m => (
            <div key={m.label}>
              <p className="text-[1.1rem] uppercase tracking-[0.06em] text-white/30">{m.label}</p>
              <p className="mt-[0.35rem] truncate text-[1.45rem] font-medium tabular-nums text-white/90">
                {m.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TokenTradePanel({ token }: { token: TokenDetail }) {
  const canTrade = !token.curveLocked || token.graduated;
  return (
    <section className="flex h-full flex-col rounded-[1.8rem] border border-white/[0.06] bg-[#0d0d0d] p-[1.4rem] sm:p-[1.6rem]">
      {!canTrade ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-[1.6rem] flex items-center gap-[1rem]">
            <div className="relative size-[4.4rem] overflow-hidden rounded-[1.1rem] bg-black/40 ring-1 ring-white/10">
              <Image src={token.imageUrl} alt={token.name} fill className="object-cover" sizes="44px" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[1.9rem] font-semibold text-white">{token.name}</h2>
              <p className="text-[1.2rem] text-white/40">{token.symbol}</p>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center rounded-[1.4rem] border border-dashed border-white/10 px-[1.4rem] py-[3rem] text-center text-[1.25rem] text-white/40">
            Curve locked — launch the pool from Lifecycle to trade on DEX.
          </div>
        </div>
      ) : (
        <TradeInfo
          tradeType="buy"
          isGraduated={token.graduated}
          poolAddress={token.pair as `0x${string}` | undefined}
          tokenAddress={token.id}
          tokenName={token.name}
          tokenSymbol={token.symbol}
          tokenImage={token.imageUrl}
        />
      )}
    </section>
  );
}

function parsePriceLabel(label?: string): number | undefined {
  if (!label || label === "—") return undefined;
  const n = Number(String(label).replace(/ MON$/i, "").trim());
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function fetchIndexedChart(
  tokenId: string,
  tf: ChartTimeframe,
): Promise<{ series: PriceChartPoint[]; source: "subgraph" | "mongo" | "none" }> {
  try {
    const res = await fetch(`/api/tokens/${tokenId}/chart?tf=${tf}`);
    const data = await res.json();
    const series = (data.series || []) as PriceChartPoint[];
    const source = (data.source || "none") as "subgraph" | "mongo" | "none";
    return { series: series.length > 1 ? series : [], source: series.length > 1 ? source : "none" };
  } catch {
    return { series: [], source: "none" };
  }
}

function TokenChart({ token }: { token: TokenDetail }) {
  const [tf, setTf] = useState<ChartTimeframe>("1H");
  const [series, setSeries] = useState<PriceChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"subgraph" | "mongo" | "rpc" | null>(null);
  const spot = token.priceNative ?? parsePriceLabel(token.priceLabel);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const indexed = await fetchIndexedChart(token.id, tf);
        if (!cancelled && indexed.series.length > 1) {
          setSeries(indexed.series);
          setSource(indexed.source === "none" ? "mongo" : indexed.source);
          return;
        }
        const points = await getTokenPriceSeries(token.id, tf, spot);
        if (!cancelled) {
          setSeries(points);
          setSource(points.length > 1 ? "rpc" : null);
        }
      } catch {
        if (!cancelled) {
          setSeries([]);
          setSource(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token.id, spot, tf]);

  const hasSeries = series.length > 1;
  const min = hasSeries ? Math.min(...series.map(p => p.v)) : 0;
  const max = hasSeries ? Math.max(...series.map(p => p.v)) : 1;
  const w = 800;
  const h = 320;
  const pad = 12;
  const chartPoints = hasSeries
    ? series.map((p, i) => ({
        x: pad + (i / (series.length - 1)) * (w - pad * 2),
        y: pad + (1 - (p.v - min) / (max - min || 1)) * (h - pad * 2),
      }))
    : [];
  const linePath = hasSeries ? smoothLinePath(chartPoints, 0.5) : "";
  const areaPath = hasSeries ? smoothAreaPath(chartPoints, h - pad, 0.5) : "";

  const sourceLabel =
    source === "subgraph" ? " · graph" : source === "mongo" ? " · indexed" : source === "rpc" ? " · live" : "";

  return (
    <section className="flex h-full flex-col rounded-[1.8rem] border border-white/[0.06] bg-[#121212] p-[1.4rem] sm:p-[1.8rem]">
      <div className="mb-[1.4rem] flex flex-col gap-[1rem] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[1.15rem] uppercase tracking-[0.06em] text-white/30">
            Overview{sourceLabel}
          </p>
          <p className="mt-[0.25rem] text-[2rem] font-semibold tabular-nums text-white">
            {token.priceLabel && token.priceLabel !== "—" ? token.priceLabel : token.marketCapLabel}
          </p>
        </div>
        <div className="inline-flex gap-[0.25rem] self-start rounded-full bg-white/[0.04] p-[0.3rem]">
          {TIMEFRAMES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTf(t)}
              className={cn(
                "rounded-full px-[1rem] py-[0.45rem] text-[1.1rem] font-medium transition-colors",
                tf === t ? "bg-white/10 text-white" : "text-white/35 hover:text-white/70",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-[26rem] flex-1 overflow-hidden rounded-[1.2rem] bg-[#0c0c0c]">
        {hasSeries ? (
          <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none" aria-hidden>
            {[0.25, 0.5, 0.75].map(g => (
              <line
                key={g}
                x1={0}
                x2={w}
                y1={h * g}
                y2={h * g}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
              />
            ))}
            <path d={areaPath} fill="rgba(194,255,44,0.1)" />
            <path
              d={linePath}
              fill="none"
              stroke="#C2FF2C"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[0.6rem] px-[2rem] text-center">
            <div className="h-[1px] w-[40%] bg-gradient-to-r from-transparent via-accent-500/40 to-transparent" />
            <p className="text-[1.35rem] text-white/45">
              {loading ? "Loading chart…" : "Waiting for spot price…"}
            </p>
            <p className="max-w-[32rem] text-[1.15rem] text-white/25">
              Prefers The Graph, then Mongo candles, then live RPC.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function formatTradeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type UiTrade = {
  id: string;
  buy: boolean;
  amountLabel: string;
  address: string;
  ethLabel: string;
  timeLabel: string;
};

function RecentTrades({ tokenId }: { tokenId: string }) {
  const [tab, setTab] = useState<"trades" | "holders">("trades");
  const [trades, setTrades] = useState<UiTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/tokens/${tokenId}/trades?limit=40`);
        const data = await res.json();
        const rows = (data.trades || []) as Array<{
          id: string;
          buy: boolean;
          trader: string;
          amountNative: number;
          amountToken: number;
          timestamp: string;
        }>;
        if (cancelled) return;
        setTrades(
          rows.map(t => ({
            id: t.id,
            buy: t.buy,
            amountLabel: `${t.amountToken.toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens`,
            address: shortenAddress(t.trader),
            ethLabel: formatCompactMon(t.amountNative),
            timeLabel: formatTradeTime(t.timestamp),
          })),
        );
      } catch {
        if (!cancelled) setTrades([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  return (
    <section className="mt-[1.6rem] rounded-[1.8rem] border border-white/[0.06] bg-[#121212] p-[1.4rem] sm:p-[1.8rem]">
      <div className="mb-[1.4rem] flex items-center justify-between gap-[1rem]">
        <div className="inline-flex gap-[0.25rem] rounded-full bg-white/[0.04] p-[0.3rem]">
          <button
            type="button"
            onClick={() => setTab("trades")}
            className={cn(
              "rounded-full px-[1.3rem] py-[0.55rem] text-[1.2rem] font-medium",
              tab === "trades" ? "bg-white/10 text-white" : "text-white/40",
            )}
          >
            Trades
          </button>
          <button
            type="button"
            onClick={() => setTab("holders")}
            className={cn(
              "rounded-full px-[1.3rem] py-[0.55rem] text-[1.2rem] font-medium",
              tab === "holders" ? "bg-white/10 text-white" : "text-white/40",
            )}
          >
            Holders
          </button>
        </div>
      </div>

      {tab === "trades" ? (
        trades.length === 0 ? (
          <div className="rounded-[1.2rem] border border-dashed border-white/10 px-[1.4rem] py-[3.5rem] text-center text-[1.25rem] text-white/30">
            {loading ? "Loading trades…" : "No trades yet — deploy/sync the subgraph or wait for Buy/Sell events"}
          </div>
        ) : (
          <div className="space-y-[0.3rem]">
            {trades.map(trade => (
              <div
                key={trade.id}
                className="flex items-center gap-[1rem] rounded-[1rem] px-[0.8rem] py-[0.9rem] transition-colors hover:bg-white/[0.03]"
              >
                <span
                  className={cn(
                    "grid size-[2.2rem] place-content-center rounded-full",
                    trade.buy ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400",
                  )}
                >
                  {trade.buy ? <ArrowUpRight className="size-[1.2rem]" /> : <ArrowDownLeft className="size-[1.2rem]" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[1.25rem] font-medium text-white">{trade.amountLabel}</p>
                  <p className="text-[1.05rem] text-white/35">{trade.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-[1.2rem] text-white/85">{trade.ethLabel}</p>
                  <p className="text-[1.05rem] text-white/35">{trade.timeLabel}</p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="rounded-[1.2rem] border border-dashed border-white/10 px-[1.4rem] py-[3.5rem] text-center text-[1.25rem] text-white/30">
          Holder list coming soon
        </div>
      )}
    </section>
  );
}

export default function TokenDetailPage({ tokenId }: { tokenId: string }) {
  const [token, setToken] = useState<TokenDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const setTokenAddress = useTokenStore(s => s.setTokenAddress);
  const setMetadata = useTokenStore(s => s.setMetadata);
  const setRefetch = useTokenStore(s => s.setRefetch);

  const hydrate = useCallback(async () => {
    setLoading(true);
    try {
      const api = await fetchApiToken(tokenId);
      let detail = api ? apiToTokenDetail(api) : null;

      try {
        const life = await getTokenLifecycle(tokenId);
        if (detail) {
          detail = {
            ...detail,
            graduated: life.listed || detail.graduated,
            curveLocked: life.locked,
            progress: life.progress,
            curve: life.curve || detail.curve,
            pair: life.pair || detail.pair,
            phase: derivePhaseFromLifecycle(life),
            inactive: life.inactive,
            recyclingEligible: life.recyclingEligible,
            vaultStatus: life.vaultStatus,
            proposal: life.proposalId
              ? {
                  id: life.proposalId,
                  state: life.proposalState || undefined,
                  candidates: life.proposalCandidates,
                  endTime: life.proposalEndTime
                    ? new Date(life.proposalEndTime * 1000).toISOString()
                    : undefined,
                  winner: life.proposalWinner,
                  executed: life.proposalState === "Executed",
                }
              : detail.proposal,
            socials: {
              ...detail.socials,
              contract: explorerAddressUrl(detail.id),
              curve: life.curve ? explorerAddressUrl(life.curve) : detail.socials.curve,
              pool: life.pair ? explorerAddressUrl(life.pair) : detail.socials.pool,
            },
          };
        } else if (life.curve) {
          detail = {
            id: tokenId as `0x${string}`,
            name: "Token",
            symbol: "TKN",
            imageUrl: "/gmonad.jpeg",
            description: "Reflow bonding-curve token on Monad Testnet.",
            marketCapLabel: "$—",
            liquidityLabel: life.listed ? "DEX" : "Bonding",
            volume24hLabel: "$—",
            athLabel: "$—",
            change1h: 0,
            burnedLabel: "—",
            burnedUsd: "—",
            burnedPct: "—",
            progress: life.progress,
            graduated: life.listed,
            curveLocked: life.locked,
            curve: life.curve,
            pair: life.pair,
            phase: derivePhaseFromLifecycle(life),
            inactive: life.inactive,
            recyclingEligible: life.recyclingEligible,
            vaultStatus: life.vaultStatus,
            socials: {
              contract: explorerAddressUrl(tokenId),
              curve: explorerAddressUrl(life.curve),
              pool: life.pair ? explorerAddressUrl(life.pair) : undefined,
            },
          };
        }
      } catch {
        /* chain optional */
      }

      try {
        const meta = await readErc20Meta(tokenId);
        if (meta && detail) {
          const placeholder = !detail.name || detail.name === "Token" || !detail.symbol || detail.symbol === "TKN";
          if (placeholder) {
            detail = {
              ...detail,
              name: meta.name || detail.name,
              symbol: meta.symbol || detail.symbol,
            };
          }
        } else if (meta && !detail) {
          detail = {
            id: tokenId as `0x${string}`,
            name: meta.name,
            symbol: meta.symbol,
            imageUrl: "/gmonad.jpeg",
            description: "Reflow bonding-curve token on Monad Testnet.",
            marketCapLabel: "$—",
            liquidityLabel: "Bonding",
            volume24hLabel: "$—",
            athLabel: "$—",
            change1h: 0,
            burnedLabel: "—",
            burnedUsd: "—",
            burnedPct: "—",
            graduated: false,
            socials: { contract: explorerAddressUrl(tokenId) },
          };
        }
      } catch {
        /* optional */
      }

      try {
        const stats = await getTokenMarketStats(tokenId);
        if (stats && detail) {
          detail = applyMarketStatsToDetail(detail, stats);
          void persistTokenPatch({
            address: detail.id,
            name: detail.name,
            symbol: detail.symbol,
            imageUrl: typeof detail.imageUrl === "string" ? detail.imageUrl : undefined,
            description: detail.description,
            curve: stats.curve || detail.curve,
            pair: stats.pair || detail.pair,
            graduated: stats.listed || detail.graduated,
            isListing: stats.listed || detail.graduated,
            progress: stats.progress || detail.progress,
            phase: detail.phase,
            marketCapUsd: stats.marketCapUsd,
            volumeUsd: stats.volumeUsd,
            virtualNative: stats.virtualNative,
            virtualToken: stats.virtualToken,
            reserveNative: stats.reserveNative,
            reserveToken: stats.reserveToken,
          });
        }
      } catch {
        /* market stats optional */
      }

      setToken(detail);
      if (detail) {
        setTokenAddress(detail.id);
        setMetadata({
          name: detail.name,
          description: detail.description,
          image: detail.imageUrl,
          tokenAddress: detail.id,
          symbol: detail.symbol,
          marketCap: detail.marketCapLabel,
          price: detail.priceLabel,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [tokenId, setTokenAddress, setMetadata]);

  useEffect(() => {
    setRefetch(() => {
      void hydrate();
    });
    void hydrate();
  }, [hydrate, setRefetch]);

  if (loading && !token) {
    return (
      <div className="page-container pb-[6rem]">
        <div className="animate-pulse rounded-[1.8rem] border border-white/[0.06] bg-[#121212] px-[2rem] py-[8rem] text-center text-white/40">
          Loading token…
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="page-container pb-[6rem]">
        <div className="rounded-[1.8rem] border border-white/[0.06] bg-[#121212] px-[2rem] py-[6rem] text-center">
          <p className="text-[1.6rem] text-white/55">Token not found</p>
          <Link href="/" className="mt-[1.2rem] inline-block text-[1.3rem] text-accent-500 hover:underline">
            Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container pb-[6rem]">
      <div className="mb-[1.4rem]">
        <Link
          href="/"
          className="inline-flex items-center gap-[0.5rem] text-[1.25rem] text-white/40 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-[1.3rem]" />
          Explore
        </Link>
      </div>

      <TokenHero token={token} />

      <div className="grid grid-cols-1 gap-[1.6rem] lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-4">
          <TokenTradePanel token={token} />
        </div>
        <div className="lg:col-span-8">
          <TokenChart token={token} />
        </div>
      </div>

      <div className="mt-[1.6rem]">
        <LifecyclePanel
          tokenAddress={token.id}
          tokenName={token.name}
          tokenSymbol={token.symbol}
          initialCurve={token.curve}
          onUpdated={() => void hydrate()}
        />
      </div>

      <RecentTrades tokenId={token.id} />
    </div>
  );
}
