"use client";

import Image from "next/image";
import Link from "next/link";
import type { GraduatedToken } from "~~/constants/graduatedTokens";
import { shortenAddress } from "~~/utils/addressShort";

export default function GraduatedTokenCard({ token }: { token: GraduatedToken }) {
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
          <div className="absolute left-[0.8rem] top-[0.8rem] flex flex-wrap items-center gap-[0.5rem]">
            <span className="rounded-full bg-black/55 px-[0.85rem] py-[0.35rem] text-[1rem] font-medium text-white/85 backdrop-blur-sm">
              Graduated
            </span>
            {(token.inactive || token.phase === "inactive") && (
              <span className="rounded-full border border-orange-500/40 bg-orange-500/25 px-[0.85rem] py-[0.35rem] text-[1rem] font-medium text-orange-300 backdrop-blur-sm">
                Inactive
              </span>
            )}
            {token.showV2 && (
              <span className="inline-flex size-[2.2rem] items-center justify-center rounded-full bg-[#2F80FF] text-[1rem] font-bold text-white">
                V2
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-[0.85rem] px-[0.4rem] pb-[0.4rem] pt-[1.1rem]">
          <div className="flex items-start justify-between gap-[0.8rem]">
            <div className="min-w-0">
              <div className="flex items-center gap-[0.5rem]">
                <h3 className="truncate text-[1.35rem] font-semibold leading-tight text-white sm:text-[1.45rem]">
                  {token.name}
                </h3>
                {token.partner && (
                  <span
                    className="inline-flex size-[1.6rem] shrink-0 items-center justify-center rounded-full bg-amber-400 text-[0.9rem] font-bold text-black"
                    title="Partner"
                  >
                    ★
                  </span>
                )}
              </div>
              <p className="mt-[0.15rem] truncate text-[1.1rem] text-white/40">${token.symbol}</p>
            </div>
            <p className="shrink-0 text-right text-[1.15rem] font-semibold leading-snug text-white sm:text-[1.25rem]">
              {token.marketCapLabel} <span className="font-medium text-white/45">MC</span>
              {token.fdvLabel ? (
                <>
                  <br />
                  <span className="text-[1.05rem] font-medium text-white/50">{token.fdvLabel} FDV</span>
                </>
              ) : null}
            </p>
          </div>

          <div className="mt-auto flex items-center justify-between gap-[0.8rem] text-[1.05rem]">
            <span className="font-mono text-white/35">{shortenAddress(token.id)}</span>
            <span className="shrink-0 text-white/40">{token.timeAgo}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
