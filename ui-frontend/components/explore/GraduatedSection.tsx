"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import GraduatedTokenCard from "./GraduatedTokenCard";
import { TokenGridSkeleton } from "~~/components/common/TokenSkeleton";
import { useApiTokens } from "~~/hooks/useApiTokens";
import { apiToGraduatedToken } from "~~/lib/tokens/adapters";
import { cn } from "~~/lib/utils";

const PAGE_SIZE = 10;

function pageList(current: number, total: number) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 2) return [1, 2, "...", total] as const;
  if (current >= total - 1) return [1, "...", total - 1, total] as const;
  return [1, "...", current, "...", total] as const;
}

export default function GraduatedSection() {
  const { tokens: apiTokens, loading } = useApiTokens({ graduated: true });
  const [page, setPage] = useState(1);

  const list = useMemo(() => apiTokens.map(apiToGraduatedToken), [apiTokens]);

  const totalPages = Math.max(1, Math.ceil(Math.max(list.length, 1) / PAGE_SIZE));
  const pageTokens = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [list, page]);

  const pages = pageList(page, totalPages);

  return (
    <section className="surface-elevated mb-[3.2rem] rounded-[1.6rem] bg-[#141414] p-[1.6rem] sm:p-[2rem] lg:p-[2.4rem]">
      <div className="mb-[1.8rem] space-y-[0.7rem]">
        <div className="flex flex-wrap items-baseline gap-[1rem]">
          <h2 className="text-[2.8rem] font-bold leading-none text-white sm:text-[3.2rem]">Graduated</h2>
          <span className="rounded-full bg-white/10 px-[1rem] py-[0.4rem] text-[1.15rem] text-white/55">
            {list.length.toLocaleString()}
          </span>
        </div>
        <p className="text-[1.25rem] text-white/45 sm:text-[1.35rem]">
          Tokens that launched a pool and locked LP in the vault.
        </p>
      </div>

      {loading && pageTokens.length === 0 ? (
        <TokenGridSkeleton count={10} />
      ) : pageTokens.length === 0 ? (
        <div className="grid place-content-center rounded-[1.4rem] bg-[#161616] px-[2rem] py-[4rem]">
          <p className="text-center text-white/40">
            No graduated tokens yet. Hit the curve target, then launch the pool.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-[1rem] sm:grid-cols-3 sm:gap-[1.2rem] lg:grid-cols-4 xl:grid-cols-5">
          {pageTokens.map(token => (
            <GraduatedTokenCard key={token.id} token={token} />
          ))}
        </div>
      )}

      {list.length > PAGE_SIZE && (
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
  );
}
