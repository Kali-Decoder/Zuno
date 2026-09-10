"use client";

import Link from "next/link";
import { Recycle } from "lucide-react";

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 border-b border-card-border bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-white">
          <Recycle className="h-5 w-5 text-monad-purple" />
          <span className="text-sm font-semibold tracking-[0.12em] uppercase">Reflow</span>
        </Link>

        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          <span>Launch</span>
          <span className="text-monad-purple">→</span>
          <span>Graduate</span>
          <span className="text-monad-purple">→</span>
          <span>Recycle</span>
        </div>
      </div>
    </nav>
  );
}
