"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink, Recycle, Wallet } from "lucide-react";
import { REFLOW } from "@/app/config/reflow";
import { useWalletContext } from "@/app/contexts/WalletContext";
import { formatToken, shortAddress } from "@/app/lib/format";
import { explorerAddress } from "@/app/lib/provider";

export function Navigation() {
  const wallet = useWalletContext();

  return (
    <nav className="sticky top-0 z-50 border-b border-card-border bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-white">
          <Recycle className="h-5 w-5 text-monad-purple" />
          <span className="text-sm font-semibold tracking-[0.12em] uppercase">Reflow</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {wallet.isConnected ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
              <div className="hidden text-right sm:block">
                <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-500/80">Wallet</p>
                <p className="font-mono text-xs text-emerald-200">{shortAddress(wallet.account)}</p>
              </div>
              <div className="sm:border-l sm:border-emerald-500/30 sm:pl-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-500/80">Balance</p>
                <p className="text-xs font-semibold text-white">{formatToken(wallet.nativeBalance, 18, 6)} MON</p>
              </div>
            </div>
          ) : (
            <button
              onClick={wallet.connectWallet}
              className="inline-flex items-center gap-2 rounded-lg bg-monad-purple px-3 py-2 text-xs font-semibold text-white hover:bg-monad-purple/80"
            >
              <Wallet className="h-4 w-4" /> Connect
            </button>
          )}

          {wallet.isConnected && !wallet.isCorrectNetwork && (
            <button
              onClick={wallet.switchToMonad}
              className="inline-flex items-center gap-1 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-2 py-2 text-xs font-semibold text-yellow-200 hover:bg-yellow-500/20"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Monad
            </button>
          )}

          <a
            href={explorerAddress(REFLOW.core)}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white sm:inline-flex"
          >
            Core <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </nav>
  );
}
