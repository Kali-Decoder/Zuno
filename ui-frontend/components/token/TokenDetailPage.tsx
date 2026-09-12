"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Check, ChevronLeft, ChevronRight, Copy, ExternalLink } from "lucide-react";
import TradeInfo from "~~/components/coin/BuyNSell";
import { PanelSkeleton, TokenDetailSkeleton } from "~~/components/common/TokenSkeleton";
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
  const n = Number(String(label).replace(/ USDC$/i, "").trim());
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
  const dataEpoch = useTokenStore(s => s.dataEpoch);
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
  }, [token.id, spot, tf, dataEpoch]);

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
          <div
            className={cn(
              "absolute inset-0 flex flex-col p-[1.6rem]",
              loading ? "justify-end gap-[1.2rem]" : "items-center justify-center gap-[0.6rem]",
            )}
          >
            {loading ? (
              <>
                <div className="h-[60%] w-full animate-pulse rounded-[1.2rem] bg-white/[0.06]" />
                <div className="flex gap-[0.8rem]">
                  <div className="h-[0.8rem] w-[30%] animate-pulse rounded bg-white/[0.08]" />
                  <div className="h-[0.8rem] w-[20%] animate-pulse rounded bg-white/[0.06]" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-[0.6rem] px-[2rem] text-center">
                <div className="h-[1px] w-[40%] bg-gradient-to-r from-transparent via-accent-500/40 to-transparent" />
                <p className="text-[1.35rem] text-white/45">Waiting for spot price…</p>
                <p className="max-w-[32rem] text-[1.15rem] text-white/25">
                  Prefers The Graph, then Mongo candles, then live RPC.
                </p>
              </div>
            )}
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
  amountToken: number;
  amountLabel: string;
  amountNative: number;
  ethLabel: string;
  trader: string;
  traderAddressUrl: string;
  timeLabel: string;
  txHash?: string;
  txUrl?: string;
};

type UiHolder = {
  rank: number;
  address: string;
  balance: number;
  balanceFormatted: string;
  percentage: number;
  percentageFormatted: string;
  label?: string | null;
  isContract: boolean;
  txHash?: string | null;
  txUrl?: string | null;
  addressUrl: string;
};

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      title="Copy to clipboard"
      className={cn(
        "inline-flex items-center justify-center text-white/40 transition hover:text-white",
        className,
      )}
    >
      {copied ? <Check className="size-[1.2rem] text-emerald-400" /> : <Copy className="size-[1.2rem]" />}
    </button>
  );
}

const ITEMS_PER_PAGE = 10;

function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  const getPages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="mt-[1.4rem] flex flex-col items-center justify-between gap-[1rem] border-t border-white/[0.06] pt-[1.2rem] sm:flex-row">
      <p className="text-[1.15rem] text-white/40">
        Showing <span className="font-medium text-white/75">{start}–{end}</span> of{" "}
        <span className="font-medium text-white/75">{totalItems}</span>
      </p>

      <div className="flex items-center gap-[0.4rem]">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex h-[3rem] items-center gap-[0.3rem] rounded-full border border-white/10 bg-white/[0.03] px-[1.1rem] text-[1.15rem] font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-[1.3rem]" />
          <span>Prev</span>
        </button>

        <div className="flex items-center gap-[0.3rem]">
          {getPages().map((page, idx) =>
            typeof page === "string" ? (
              <span key={`dots-${idx}`} className="px-[0.5rem] text-[1.2rem] text-white/30">
                …
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={cn(
                  "grid size-[2.8rem] place-content-center rounded-full text-[1.15rem] font-medium transition",
                  page === currentPage
                    ? "bg-accent-500 font-semibold text-black"
                    : "text-white/60 hover:bg-white/10 hover:text-white",
                )}
              >
                {page}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex h-[3rem] items-center gap-[0.3rem] rounded-full border border-white/10 bg-white/[0.03] px-[1.1rem] text-[1.15rem] font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
        >
          <span>Next</span>
          <ChevronRight className="size-[1.3rem]" />
        </button>
      </div>
    </div>
  );
}

function RecentTrades({ tokenId, tokenSymbol }: { tokenId: string; tokenSymbol?: string }) {
  const [tab, setTab] = useState<"trades" | "holders">("trades");
  const [trades, setTrades] = useState<UiTrade[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(true);
  const [tradesPage, setTradesPage] = useState(1);

  const [holders, setHolders] = useState<UiHolder[]>([]);
  const [loadingHolders, setLoadingHolders] = useState(false);
  const [holdersLoaded, setHoldersLoaded] = useState(false);
  const [holdersPage, setHoldersPage] = useState(1);

  const dataEpoch = useTokenStore(s => s.dataEpoch);

  useEffect(() => {
    let cancelled = false;
    setLoadingTrades(true);
    (async () => {
      try {
        const res = await fetch(`/api/tokens/${tokenId}/trades?limit=100`);
        const data = await res.json();
        const rows = (data.trades || []) as Array<{
          id: string;
          buy: boolean;
          trader: string;
          amountNative: number;
          amountToken: number;
          timestamp: string;
          txHash?: string;
          txUrl?: string;
        }>;
        if (cancelled) return;
        setTrades(
          rows.map(t => {
            const txHash = t.txHash || "";
            return {
              id: t.id,
              buy: t.buy,
              amountToken: t.amountToken,
              amountLabel: `${t.amountToken.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
              amountNative: t.amountNative,
              ethLabel: formatCompactMon(t.amountNative),
              trader: t.trader,
              traderAddressUrl: `https://testnet.arcscan.app/address/${t.trader}`,
              timeLabel: formatTradeTime(t.timestamp),
              txHash,
              txUrl: t.txUrl || (txHash ? `https://testnet.arcscan.app/tx/${txHash}` : undefined),
            };
          }),
        );
      } catch {
        if (!cancelled) setTrades([]);
      } finally {
        if (!cancelled) setLoadingTrades(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenId, dataEpoch]);

  useEffect(() => {
    if (tab !== "holders" && holdersLoaded) return;
    let cancelled = false;
    setLoadingHolders(true);
    (async () => {
      try {
        const res = await fetch(`/api/tokens/${tokenId}/holders`);
        const data = await res.json();
        if (cancelled) return;
        if (data.ok && Array.isArray(data.holders)) {
          setHolders(data.holders);
          setHoldersLoaded(true);
        } else {
          setHolders([]);
        }
      } catch {
        if (!cancelled) setHolders([]);
      } finally {
        if (!cancelled) setLoadingHolders(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenId, tab, dataEpoch]);

  // Paginated slices
  const totalTradesPages = Math.max(1, Math.ceil(trades.length / ITEMS_PER_PAGE));
  const paginatedTrades = trades.slice(
    (tradesPage - 1) * ITEMS_PER_PAGE,
    tradesPage * ITEMS_PER_PAGE,
  );

  const totalHoldersPages = Math.max(1, Math.ceil(holders.length / ITEMS_PER_PAGE));
  const paginatedHolders = holders.slice(
    (holdersPage - 1) * ITEMS_PER_PAGE,
    holdersPage * ITEMS_PER_PAGE,
  );

  return (
    <section className="mt-[1.6rem] rounded-[1.8rem] border border-white/[0.06] bg-[#121212] p-[1.4rem] sm:p-[1.8rem]">
      <div className="mb-[1.4rem] flex items-center justify-between gap-[1rem]">
        <div className="inline-flex gap-[0.25rem] rounded-full bg-white/[0.04] p-[0.3rem]">
          <button
            type="button"
            onClick={() => setTab("trades")}
            className={cn(
              "flex items-center gap-[0.6rem] rounded-full px-[1.3rem] py-[0.55rem] text-[1.2rem] font-medium transition",
              tab === "trades" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70",
            )}
          >
            <span>Trades</span>
            {trades.length > 0 && (
              <span className="rounded-full bg-white/10 px-[0.6rem] py-[0.1rem] text-[1rem] text-white/70">
                {trades.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("holders")}
            className={cn(
              "flex items-center gap-[0.6rem] rounded-full px-[1.3rem] py-[0.55rem] text-[1.2rem] font-medium transition",
              tab === "holders" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70",
            )}
          >
            <span>Holders</span>
            {holders.length > 0 && (
              <span className="rounded-full bg-white/10 px-[0.6rem] py-[0.1rem] text-[1rem] text-white/70">
                {holders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {tab === "trades" ? (
        loadingTrades ? (
          <PanelSkeleton rows={5} className="border-0 bg-transparent p-0" />
        ) : trades.length === 0 ? (
          <div className="rounded-[1.2rem] border border-dashed border-white/10 px-[1.4rem] py-[3.5rem] text-center text-[1.25rem] text-white/30">
            No trades yet — deploy/sync the subgraph or wait for Buy/Sell events
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[1.1rem] font-medium uppercase tracking-wider text-white/40">
                    <th className="pb-[1rem] pl-[0.8rem]">Type</th>
                    <th className="pb-[1rem]">Tokens</th>
                    <th className="pb-[1rem]">Value</th>
                    <th className="pb-[1rem]">Trader</th>
                    <th className="pb-[1rem]">Time</th>
                    <th className="pb-[1rem] pr-[0.8rem] text-right">Transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {paginatedTrades.map(trade => (
                    <tr
                      key={trade.id}
                      className="transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="py-[1rem] pl-[0.8rem]">
                        <span
                          className={cn(
                            "inline-flex items-center gap-[0.4rem] rounded-full px-[0.8rem] py-[0.35rem] text-[1.1rem] font-semibold",
                            trade.buy
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400",
                          )}
                        >
                          {trade.buy ? (
                            <ArrowUpRight className="size-[1.2rem]" />
                          ) : (
                            <ArrowDownLeft className="size-[1.2rem]" />
                          )}
                          <span>{trade.buy ? "Buy" : "Sell"}</span>
                        </span>
                      </td>

                      <td className="py-[1rem]">
                        <span className="text-[1.2rem] font-medium text-white">
                          {trade.amountLabel}
                        </span>
                      </td>

                      <td className="py-[1rem]">
                        <span className="text-[1.2rem] font-medium text-white/85">
                          {trade.ethLabel}
                        </span>
                      </td>

                      <td className="py-[1rem]">
                        <div className="flex items-center gap-[0.5rem]">
                          <a
                            href={trade.traderAddressUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[1.15rem] text-white/70 transition hover:text-white hover:underline"
                            title={trade.trader}
                          >
                            {shortenAddress(trade.trader)}
                          </a>
                          <CopyButton text={trade.trader} />
                        </div>
                      </td>

                      <td className="py-[1rem]">
                        <span className="text-[1.15rem] text-white/40">
                          {trade.timeLabel}
                        </span>
                      </td>

                      <td className="py-[1rem] pr-[0.8rem] text-right">
                        {trade.txUrl ? (
                          <a
                            href={trade.txUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-[0.4rem] rounded-full bg-white/[0.04] px-[0.85rem] py-[0.4rem] font-mono text-[1.1rem] text-white/70 transition hover:bg-white/10 hover:text-white"
                            title="View transaction on ArcScan Explorer"
                          >
                            <span>
                              {trade.txHash
                                ? `${trade.txHash.slice(0, 6)}...${trade.txHash.slice(-4)}`
                                : "View Tx"}
                            </span>
                            <ExternalLink className="size-[1.1rem]" />
                          </a>
                        ) : (
                          <span className="text-[1.15rem] text-white/20">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={tradesPage}
              totalPages={totalTradesPages}
              totalItems={trades.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setTradesPage}
            />
          </div>
        )
      ) : loadingHolders ? (
        <PanelSkeleton rows={5} className="border-0 bg-transparent p-0" />
      ) : holders.length === 0 ? (
        <div className="rounded-[1.2rem] border border-dashed border-white/10 px-[1.4rem] py-[3.5rem] text-center text-[1.25rem] text-white/30">
          No holders found for this token
        </div>
      ) : (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-[1.1rem] font-medium uppercase tracking-wider text-white/40">
                  <th className="w-[4.5rem] pb-[1rem] pl-[0.8rem]">#</th>
                  <th className="pb-[1rem]">Holder</th>
                  <th className="pb-[1rem]">Percentage</th>
                  <th className="pb-[1rem]">Quantity</th>
                  <th className="pb-[1rem] pr-[0.8rem] text-right">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {paginatedHolders.map(holder => (
                  <tr
                    key={holder.address}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="py-[1rem] pl-[0.8rem]">
                      <span
                        className={cn(
                          "font-mono text-[1.15rem]",
                          holder.rank === 1
                            ? "font-bold text-amber-400"
                            : holder.rank === 2
                            ? "font-bold text-zinc-300"
                            : holder.rank === 3
                            ? "font-bold text-amber-600"
                            : "text-white/40",
                        )}
                      >
                        #{holder.rank}
                      </span>
                    </td>

                    <td className="py-[1rem]">
                      <div className="flex flex-wrap items-center gap-[0.6rem]">
                        <a
                          href={holder.addressUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[1.15rem] text-white/80 transition hover:text-white hover:underline"
                          title={holder.address}
                        >
                          {shortenAddress(holder.address)}
                        </a>
                        <CopyButton text={holder.address} />
                        {holder.label && (
                          <span
                            className={cn(
                              "rounded-full px-[0.7rem] py-[0.15rem] text-[1rem] font-medium",
                              holder.label === "Bonding Curve"
                                ? "border border-purple-500/25 bg-purple-500/15 text-purple-300"
                                : holder.label === "Uniswap V2 Pair"
                                ? "border border-emerald-500/25 bg-emerald-500/15 text-emerald-300"
                                : holder.label === "Creator"
                                ? "border border-amber-500/25 bg-amber-500/15 text-amber-300"
                                : holder.label === "Creator Seed Lock"
                                ? "border border-cyan-500/25 bg-cyan-500/15 text-cyan-300"
                                : "bg-white/10 text-white/70",
                            )}
                          >
                            {holder.label}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-[1rem]">
                      <div className="flex items-center gap-[0.8rem]">
                        <div className="h-[0.5rem] w-[5rem] overflow-hidden rounded-full bg-white/10 sm:w-[7rem]">
                          <div
                            className="h-full rounded-full bg-accent-500"
                            style={{
                              width: `${Math.min(100, Math.max(2, holder.percentage))}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-[1.15rem] text-white/75">
                          {holder.percentageFormatted}
                        </span>
                      </div>
                    </td>

                    <td className="py-[1rem]">
                      <span className="text-[1.2rem] font-medium text-white/90">
                        {holder.balanceFormatted}
                        {tokenSymbol ? (
                          <span className="ml-[0.4rem] text-[1.05rem] text-white/40">
                            ${tokenSymbol}
                          </span>
                        ) : null}
                      </span>
                    </td>

                    <td className="py-[1rem] pr-[0.8rem] text-right">
                      {holder.txUrl ? (
                        <a
                          href={holder.txUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-[0.4rem] rounded-full bg-white/[0.04] px-[0.85rem] py-[0.4rem] font-mono text-[1.1rem] text-white/70 transition hover:bg-white/10 hover:text-white"
                          title="View acquisition transaction on ArcScan"
                        >
                          <span>
                            {holder.txHash
                              ? `${holder.txHash.slice(0, 6)}...${holder.txHash.slice(-4)}`
                              : "View Tx"}
                          </span>
                          <ExternalLink className="size-[1.1rem]" />
                        </a>
                      ) : (
                        <a
                          href={holder.addressUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-[0.4rem] rounded-full bg-white/[0.02] px-[0.85rem] py-[0.4rem] text-[1.1rem] text-white/40 transition hover:bg-white/10 hover:text-white/80"
                          title="View on ArcScan Explorer"
                        >
                          <span>Explorer</span>
                          <ExternalLink className="size-[1.1rem]" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={holdersPage}
            totalPages={totalHoldersPages}
            totalItems={holders.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setHoldersPage}
          />
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

  const hydrate = useCallback(async (opts?: { soft?: boolean }) => {
    const soft = Boolean(opts?.soft);
    if (!soft) setLoading(true);
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
            imageUrl: "/zuno-logo.png",
            description: "ZUNO bonding-curve token on Arc Testnet.",
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
            imageUrl: "/zuno-logo.png",
            description: "ZUNO bonding-curve token on Arc Testnet.",
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
      if (!soft) setLoading(false);
    }
  }, [tokenId, setTokenAddress, setMetadata]);

  useEffect(() => {
    setRefetch(() => {
      void hydrate({ soft: true });
    });
    void hydrate();
  }, [hydrate, setRefetch]);

  if (loading && !token) {
    return <TokenDetailSkeleton />;
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
          onUpdated={() => void hydrate({ soft: true })}
        />
      </div>

      <RecentTrades tokenId={token.id} tokenSymbol={token.symbol} />
    </div>
  );
}
