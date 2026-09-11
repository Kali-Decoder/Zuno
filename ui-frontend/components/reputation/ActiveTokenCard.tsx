"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { ApiToken } from "~~/hooks/useApiTokens";
import { formatCompactUsd } from "~~/lib/reflow/format";
import { cn } from "~~/lib/utils";
import { shortenAddress } from "~~/utils/addressShort";

type Props = {
  token: ApiToken;
  className?: string;
};

/** Card for live listed pools — vault-locked LP, DEX trading. */
export default function ActiveTokenCard({ token, className }: Props) {
  const href = `/token/${token.address}`;
  const mcap = formatCompactUsd(token.marketCapUsd);
  const vault = token.vaultStatus && token.vaultStatus !== "None" ? token.vaultStatus : "Locked";

  return (
    <Link href={href} className={cn("group block", className)}>
      <article className="flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-white/[0.06] bg-[#121212] transition-colors hover:border-accent-500/25 hover:bg-[#161616]">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#0c0c0c]">
          <Image
            src={token.imageUrl || "/gmonad.jpeg"}
            alt={token.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
          <div className="absolute left-[0.9rem] top-[0.9rem] inline-flex items-center gap-[0.4rem] rounded-full bg-emerald-500/90 px-[0.85rem] py-[0.35rem] text-[1.05rem] font-semibold text-black">
            Active
          </div>
          <div className="absolute bottom-[0.9rem] right-[0.9rem] rounded-full bg-black/55 px-[0.85rem] py-[0.35rem] text-[1.05rem] text-white/80 backdrop-blur-sm">
            {vault}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-[1rem] p-[1.2rem] sm:p-[1.4rem]">
          <div className="flex items-start justify-between gap-[0.8rem]">
            <div className="min-w-0">
              <h3 className="truncate text-[1.5rem] font-semibold text-white">{token.name}</h3>
              <p className="mt-[0.2rem] text-[1.15rem] text-white/40">${token.symbol}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[1.05rem] uppercase tracking-[0.06em] text-white/30">MC</p>
              <p className="text-[1.35rem] font-semibold tabular-nums text-white">{mcap}</p>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-[0.8rem] border-t border-white/[0.06] pt-[1rem]">
            <span className="font-mono text-[1.1rem] text-white/35">{shortenAddress(token.address)}</span>
            <span className="inline-flex items-center gap-[0.35rem] text-[1.15rem] text-accent-500 opacity-80 transition-opacity group-hover:opacity-100">
              Trade
              <ExternalLink className="size-[1.15rem]" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
