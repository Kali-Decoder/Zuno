"use client";

import { cn } from "~~/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-white/[0.08]", className)} />;
}

/** Matches Explore / Graduated square token cards. */
export function TokenCardSkeleton({ className }: { className?: string }) {
  return (
    <article
      className={cn(
        "token-card-surface flex h-full flex-col rounded-[1.4rem] bg-[#161616] p-[0.8rem]",
        className,
      )}
      aria-hidden
    >
      <Bone className="aspect-square w-full rounded-[1rem]" />
      <div className="flex flex-1 flex-col gap-[1rem] px-[0.4rem] pb-[0.4rem] pt-[1.1rem]">
        <div className="flex items-start justify-between gap-[0.8rem]">
          <div className="min-w-0 flex-1 space-y-[0.5rem]">
            <Bone className="h-[1.4rem] w-[70%]" />
            <Bone className="h-[1.1rem] w-[40%]" />
          </div>
          <Bone className="h-[1.3rem] w-[4.5rem] shrink-0" />
        </div>
        <div className="mt-auto flex items-center gap-[0.8rem]">
          <Bone className="h-[0.32rem] flex-1 rounded-full" />
          <Bone className="h-[1.1rem] w-[3.2rem] shrink-0" />
        </div>
      </div>
    </article>
  );
}

/** Wider card used on Tokens tab (Active / CoinCard grids). */
export function WideTokenCardSkeleton({ className }: { className?: string }) {
  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-white/[0.06] bg-[#121212]",
        className,
      )}
      aria-hidden
    >
      <Bone className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-[1rem] p-[1.2rem] sm:p-[1.4rem]">
        <div className="flex items-start justify-between gap-[0.8rem]">
          <div className="min-w-0 flex-1 space-y-[0.5rem]">
            <Bone className="h-[1.5rem] w-[65%]" />
            <Bone className="h-[1.15rem] w-[35%]" />
          </div>
          <div className="shrink-0 space-y-[0.4rem]">
            <Bone className="ml-auto h-[1rem] w-[2.4rem]" />
            <Bone className="h-[1.35rem] w-[4.8rem]" />
          </div>
        </div>
        <Bone className="h-[1.1rem] w-[50%]" />
      </div>
    </article>
  );
}

type GridProps = {
  count?: number;
  className?: string;
  variant?: "explore" | "wide";
};

export function TokenGridSkeleton({ count = 10, className, variant = "explore" }: GridProps) {
  const Card = variant === "wide" ? WideTokenCardSkeleton : TokenCardSkeleton;
  return (
    <div
      className={cn(
        variant === "wide"
          ? "grid grid-cols-1 gap-[1.6rem] sm:grid-cols-2 lg:grid-cols-3"
          : "grid grid-cols-2 gap-[1rem] sm:grid-cols-3 sm:gap-[1.2rem] lg:grid-cols-4 xl:grid-cols-5",
        className,
      )}
      role="status"
      aria-label="Loading tokens"
    >
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} />
      ))}
      <span className="sr-only">Loading tokens</span>
    </div>
  );
}

/** Full token detail page placeholder. */
export function TokenDetailSkeleton() {
  return (
    <div className="page-container pb-[6rem]" role="status" aria-label="Loading token">
      <Bone className="mb-[1.4rem] h-[1.4rem] w-[8rem]" />

      <div className="mb-[1.6rem] flex flex-col gap-[1.6rem] rounded-[1.8rem] border border-white/[0.06] bg-[#121212] p-[1.6rem] sm:flex-row sm:items-center sm:p-[2rem]">
        <Bone className="size-[8rem] shrink-0 rounded-[1.2rem] sm:size-[10rem]" />
        <div className="min-w-0 flex-1 space-y-[1rem]">
          <Bone className="h-[2.4rem] w-[55%] max-w-[28rem]" />
          <Bone className="h-[1.4rem] w-[30%] max-w-[14rem]" />
          <div className="flex flex-wrap gap-[0.8rem] pt-[0.4rem]">
            <Bone className="h-[2.8rem] w-[9rem] rounded-full" />
            <Bone className="h-[2.8rem] w-[9rem] rounded-full" />
            <Bone className="h-[2.8rem] w-[7rem] rounded-full" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[1.6rem] lg:grid-cols-12">
        <div className="space-y-[1.2rem] rounded-[1.8rem] border border-white/[0.06] bg-[#121212] p-[1.6rem] lg:col-span-4">
          <Bone className="h-[1.4rem] w-[40%]" />
          <Bone className="h-[4.8rem] w-full rounded-[1rem]" />
          <Bone className="h-[4.8rem] w-full rounded-[1rem]" />
          <Bone className="h-[4.4rem] w-full rounded-full" />
        </div>
        <div className="rounded-[1.8rem] border border-white/[0.06] bg-[#121212] p-[1.6rem] lg:col-span-8">
          <div className="mb-[1.2rem] flex gap-[0.8rem]">
            <Bone className="h-[2.8rem] w-[5rem] rounded-full" />
            <Bone className="h-[2.8rem] w-[5rem] rounded-full" />
            <Bone className="h-[2.8rem] w-[5rem] rounded-full" />
          </div>
          <Bone className="h-[28rem] w-full rounded-[1.2rem]" />
        </div>
      </div>

      <div className="mt-[1.6rem] space-y-[1.2rem] rounded-[1.8rem] border border-white/[0.06] bg-[#121212] p-[1.6rem] sm:p-[2rem]">
        <Bone className="h-[1.6rem] w-[30%]" />
        <Bone className="h-[1.2rem] w-[70%]" />
        <Bone className="h-[8rem] w-full rounded-[1.2rem]" />
      </div>

      <span className="sr-only">Loading token</span>
    </div>
  );
}

/** Compact panel skeleton (lifecycle, trades list, etc.). */
export function PanelSkeleton({ className, rows = 4 }: { className?: string; rows?: number }) {
  return (
    <div
      className={cn(
        "space-y-[1rem] rounded-[1.8rem] border border-white/[0.06] bg-[#121212] p-[1.6rem] sm:p-[2rem]",
        className,
      )}
      role="status"
      aria-label="Loading"
    >
      <Bone className="h-[1.5rem] w-[35%]" />
      {Array.from({ length: rows }, (_, i) => (
        <Bone key={i} className="h-[3.2rem] w-full rounded-[0.8rem]" />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Leaderboard / table row skeletons. */
export function TableSkeleton({ rows = 8, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-[0.8rem]", className)} role="status" aria-label="Loading">
      <div className="flex gap-[1.2rem] px-[0.4rem] pb-[0.4rem]">
        <Bone className="h-[1.2rem] w-[4rem]" />
        <Bone className="h-[1.2rem] w-[12rem]" />
        <Bone className="ml-auto h-[1.2rem] w-[6rem]" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-[1.2rem] rounded-[1rem] border border-white/[0.04] bg-white/[0.02] px-[1.2rem] py-[1.2rem]"
        >
          <Bone className="size-[2.4rem] rounded-full" />
          <Bone className="h-[1.3rem] w-[40%] max-w-[18rem]" />
          <Bone className="ml-auto h-[1.3rem] w-[5rem]" />
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}
