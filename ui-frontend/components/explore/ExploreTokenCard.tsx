"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Crown } from "lucide-react";
import type { ExploreToken } from "~~/constants/exploreTokens";
import { cn } from "~~/lib/utils";
import { shortenAddress } from "~~/utils/addressShort";

function Badge({ type }: { type: NonNullable<ExploreToken["badge"]> }) {
  if (type === "warn") {
    return (
      <span className="inline-flex size-[2.2rem] items-center justify-center rounded-full bg-yellow-500 text-black">
        <AlertTriangle className="size-[1.2rem]" strokeWidth={2.5} />
      </span>
    );
  }
  if (type === "OG") {
    return (
      <span className="inline-flex h-[2.2rem] min-w-[2.2rem] items-center justify-center rounded-full bg-orange-500 px-[0.6rem] text-[1rem] font-bold text-white">
        OG
      </span>
    );
  }
  return (
    <span className="inline-flex h-[2.2rem] min-w-[2.2rem] items-center justify-center rounded-full bg-[#2F80FF] px-[0.6rem] text-[1rem] font-bold text-white">
      V2
    </span>
  );
}

export default function ExploreTokenCard({ token }: { token: ExploreToken }) {
  return (
    <Link href={`/token/${token.id}`} className="block">
      <article className="token-card-surface group flex h-full flex-col rounded-[1.4rem] bg-[#161616] p-[0.8rem] transition-[background-color] hover:bg-[#1b1b1b]">
        <div className="relative aspect-square w-full overflow-hidden rounded-[1rem] bg-[#0d0d0d]">
          <Image
            src={token.imageUrl}
            alt={token.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
          <div className="absolute left-[0.8rem] top-[0.8rem] flex items-center gap-[0.5rem]">
            {token.badge && <Badge type={token.badge} />}
          </div>
          {token.badge === "OG" && (
            <div className="absolute right-[0.8rem] top-[0.8rem]">
              <span className="inline-flex size-[2.2rem] items-center justify-center rounded-full bg-[#F5C542] text-black">
                <Crown className="size-[1.2rem]" strokeWidth={2.5} />
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-[1rem] px-[0.4rem] pb-[0.4rem] pt-[1.1rem]">
          <div className="flex items-start justify-between gap-[0.8rem]">
            <div className="min-w-0">
              <h3 className="truncate text-[1.35rem] font-semibold leading-tight text-white sm:text-[1.45rem]">
                {token.name}
              </h3>
              <p className="mt-[0.2rem] truncate text-[1.1rem] text-white/40">${token.symbol}</p>
            </div>
            <p className="shrink-0 text-[1.2rem] font-semibold text-white sm:text-[1.3rem]">
              {token.marketCapLabel} <span className="font-medium text-white/45">MC</span>
            </p>
          </div>

          <div className="mt-auto flex items-center gap-[0.8rem]">
            <div className="h-[0.32rem] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-accent-500 transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, token.progress))}%` }}
              />
            </div>
            <span className="shrink-0 text-[1.05rem] tabular-nums text-white/40">
              {token.progress.toFixed(2)}%
            </span>
          </div>

          <div className="flex items-center justify-between gap-[0.8rem] text-[1.05rem]">
            <span className="font-mono text-white/35">{shortenAddress(token.id)}</span>
            <span className={cn("shrink-0 font-medium text-accent-500")}>{token.timeAgo}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
