"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Layers,
  Lock,
  Recycle,
  Rocket,
  Scale,
  Sparkles,
  TrendingUp,
  Vote,
  Wallet,
  Waves,
} from "lucide-react";
import ConnectWalletButton from "~~/components/common/ConnectWalletButton";
import HoverButton from "~~/components/common/HoverButton";
import { useAccount } from "wagmi";
import { cn } from "~~/lib/utils";

const LIFECYCLE = [
  {
    id: "launch",
    title: "Launch",
    icon: Rocket,
    body: "Create a token on the bonding curve via Core.createCurve. Optional seed buy sets initial virtual reserves.",
    href: "/launch",
    cta: "Open launchpad",
  },
  {
    id: "bond",
    title: "Bond",
    icon: TrendingUp,
    body: "Buy and sell on the curve until the graduation target is hit. Progress is tracked live on the token page.",
    href: "/",
    cta: "Explore bonding",
  },
  {
    id: "graduate",
    title: "Graduate",
    icon: Lock,
    body: "When the curve locks, anyone can call listing(). A Uniswap V2 pool opens and LP is locked in the recycling vault — not burned.",
    href: "/tokens",
    cta: "View tokens",
  },
  {
    id: "trade",
    title: "Trade",
    icon: Waves,
    body: "Post-listing swaps go through DexRouter. ActivityMonitor records volume and tx count for inactivity checks.",
    href: "/",
    cta: "Browse graduated",
  },
  {
    id: "recycle",
    title: "Recycle",
    icon: Recycle,
    body: "If a pool goes inactive, the community proposes candidates, stakes MON to vote, and executes — dead LP moves to a healthier listed token.",
    href: "/tokens",
    cta: "Inactive & votes",
  },
] as const;

const HOW_TO = [
  {
    step: "01",
    title: "Connect on Monad Testnet",
    body: "Use the Connect button in the nav. Injected wallets (MetaMask and similar) are supported.",
    icon: Wallet,
  },
  {
    step: "02",
    title: "Launch or discover",
    body: "Launch your own token from Launch, or browse bonding and graduated tokens on Explore.",
    icon: Sparkles,
  },
  {
    step: "03",
    title: "Trade the curve",
    body: "On a token page, buy/sell with live quotes. Watch graduation progress until the curve locks.",
    icon: TrendingUp,
  },
  {
    step: "04",
    title: "Launch the pool",
    body: "When locked, open Lifecycle → Launch pool. LP registers in the vault and DEX trading begins.",
    icon: Layers,
  },
  {
    step: "05",
    title: "Govern recycling",
    body: "Mark inactive pools, propose candidates, vote with MON stake, then execute the winning recycle.",
    icon: Vote,
  },
] as const;

const FAQ = [
  {
    q: "What makes Reflow different?",
    a: "Most launchpads burn LP forever. Reflow locks graduated LP in a vault so inactive liquidity can be recycled into active projects by community vote.",
  },
  {
    q: "When can I launch a pool?",
    a: "After the bonding curve hits its target token reserve and locks. Anyone can then call listing() from the token Lifecycle panel.",
  },
  {
    q: "How does voting work?",
    a: "Propose a recycling-eligible (inactive) token with locked listed candidates. Voters stake MON (min ~0.01) for weight. After the voting period, execute moves LP to the winner.",
  },
  {
    q: "Which network?",
    a: "Monad Testnet (chain id 10143). Switch networks from the wallet menu if you see Wrong network.",
  },
] as const;

function PhaseChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-[1rem] py-[0.45rem] text-[1.1rem] font-medium",
        active ? "bg-accent-500 text-primary-800" : "bg-white/5 text-white/55",
      )}
    >
      {label}
    </span>
  );
}

export default function GuideTab() {
  const { isConnected } = useAccount();

  return (
    <div className="page-container pb-[6rem]">
      {/* Hero */}
      <section className="surface-elevated relative mb-[2.4rem] overflow-hidden rounded-[1.6rem] bg-[#141414] p-[2rem] sm:p-[3.2rem] lg:p-[4rem]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 10% 0%, rgba(194,255,44,0.14), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 100%, rgba(255,255,255,0.04), transparent 50%)",
          }}
        />
        <div className="relative max-w-[64rem] space-y-[1.6rem]">
          <p className="font-mono text-[1.15rem] uppercase tracking-[0.16em] text-accent-500">Platform guide</p>
          <h1 className="text-[3.2rem] font-bold leading-[1.05] text-white sm:text-[4.4rem]">
            Liquidity that <span className="text-accent-500">reflows</span>
          </h1>
          <p className="max-w-[48rem] text-[1.4rem] leading-relaxed text-white/55 sm:text-[1.55rem]">
            Reflow is a bonding-curve launchpad on Monad. Tokens graduate to Uniswap V2 with locked LP. When a pool goes
            quiet, the community can recycle that liquidity into projects that are still alive.
          </p>
          <div className="flex flex-wrap gap-[0.6rem] pt-[0.4rem]">
            <PhaseChip label="Bond" />
            <PhaseChip label="Graduate" active />
            <PhaseChip label="Trade" />
            <PhaseChip label="Vote" />
            <PhaseChip label="Recycle" />
          </div>
          <div className="flex flex-col gap-[1rem] pt-[0.8rem] sm:flex-row sm:items-center">
            {isConnected ? (
              <HoverButton isLink href="/launch">
                Launch a token
              </HoverButton>
            ) : (
              <ConnectWalletButton>Connect wallet</ConnectWalletButton>
            )}
            <Link
              href="/"
              className="inline-flex items-center gap-[0.5rem] text-[1.3rem] text-white/50 transition-colors hover:text-white"
            >
              Explore live tokens
              <ArrowRight className="size-[1.4rem]" />
            </Link>
          </div>
        </div>
      </section>

      {/* Lifecycle */}
      <section className="surface-elevated mb-[2.4rem] rounded-[1.6rem] bg-[#141414] p-[1.6rem] sm:p-[2.4rem]">
        <div className="mb-[2rem] space-y-[0.6rem]">
          <h2 className="text-[2.4rem] font-bold text-white sm:text-[2.8rem]">Token lifecycle</h2>
          <p className="max-w-[52rem] text-[1.3rem] text-white/45">
            One continuous loop — from curve discovery to vault-locked LP to community-directed recycle.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-[1.2rem] md:grid-cols-2 xl:grid-cols-5">
          {LIFECYCLE.map((item, i) => {
            const Icon = item.icon;
            return (
              <article
                key={item.id}
                className="group flex flex-col rounded-[1.2rem] bg-[#0f0f0f] p-[1.4rem] transition-colors hover:bg-[#161616]"
              >
                <div className="mb-[1.2rem] flex items-center justify-between">
                  <span className="font-mono text-[1.1rem] text-white/30">{String(i + 1).padStart(2, "0")}</span>
                  <span className="grid size-[3.2rem] place-content-center rounded-[0.8rem] bg-accent-500/10 text-accent-500">
                    <Icon className="size-[1.6rem]" />
                  </span>
                </div>
                <h3 className="mb-[0.6rem] text-[1.5rem] font-semibold text-white">{item.title}</h3>
                <p className="mb-[1.4rem] flex-1 text-[1.2rem] leading-relaxed text-white/45">{item.body}</p>
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-[0.4rem] text-[1.15rem] font-medium text-accent-500 opacity-80 transition-opacity group-hover:opacity-100"
                >
                  {item.cta}
                  <ArrowRight className="size-[1.2rem]" />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      {/* How to use */}
      <section className="mb-[2.4rem] grid grid-cols-1 gap-[1.6rem] lg:grid-cols-12">
        <div className="surface-elevated rounded-[1.6rem] bg-[#141414] p-[1.6rem] sm:p-[2.4rem] lg:col-span-7">
          <h2 className="mb-[0.6rem] text-[2.4rem] font-bold text-white">How to use Reflow</h2>
          <p className="mb-[2rem] text-[1.3rem] text-white/45">Follow the product path end to end on testnet.</p>

          <ol className="space-y-[1rem]">
            {HOW_TO.map(item => {
              const Icon = item.icon;
              return (
                <li
                  key={item.step}
                  className="flex gap-[1.2rem] rounded-[1.2rem] border border-white/[0.06] bg-[#0f0f0f] p-[1.2rem] sm:p-[1.4rem]"
                >
                  <div className="flex shrink-0 flex-col items-center gap-[0.6rem]">
                    <span className="font-mono text-[1.1rem] text-accent-500">{item.step}</span>
                    <span className="grid size-[2.8rem] place-content-center rounded-full bg-white/5 text-white/60">
                      <Icon className="size-[1.4rem]" />
                    </span>
                  </div>
                  <div>
                    <h3 className="mb-[0.35rem] text-[1.4rem] font-semibold text-white">{item.title}</h3>
                    <p className="text-[1.2rem] leading-relaxed text-white/45">{item.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex flex-col gap-[1.6rem] lg:col-span-5">
          <div className="surface-elevated flex-1 rounded-[1.6rem] bg-[#141414] p-[1.6rem] sm:p-[2.4rem]">
            <div className="mb-[1.4rem] flex items-center gap-[0.8rem]">
              <Scale className="size-[1.8rem] text-accent-500" />
              <h2 className="text-[2rem] font-bold text-white">Recycling rules</h2>
            </div>
            <ul className="space-y-[1rem]">
              {[
                "LP stays locked after graduation — never sent to burn by default.",
                "ActivityMonitor flags pools that fall below volume / tx thresholds.",
                "Candidates must be vault-locked listed tokens (healthy pools).",
                "Vote weight = MON staked; execute after the voting window succeeds.",
              ].map(line => (
                <li key={line} className="flex gap-[0.8rem] text-[1.25rem] text-white/60">
                  <Check className="mt-[0.25rem] size-[1.4rem] shrink-0 text-accent-500" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-elevated rounded-[1.6rem] border border-accent-500/20 bg-accent-500/[0.06] p-[1.6rem] sm:p-[2rem]">
            <p className="mb-[0.4rem] font-mono text-[1.1rem] uppercase tracking-[0.14em] text-accent-500">
              Token page tip
            </p>
            <p className="mb-[1.4rem] text-[1.3rem] leading-relaxed text-white/70">
              Open any token to see the <span className="text-white">Lifecycle</span> panel — progress, launch pool, mark
              inactive, propose, vote, and execute all live there.
            </p>
            <HoverButton isLink href="/tokens" className="w-full sm:w-auto">
              Go to Tokens
            </HoverButton>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="surface-elevated mb-[2.4rem] rounded-[1.6rem] bg-[#141414] p-[1.6rem] sm:p-[2.4rem]">
        <h2 className="mb-[1.6rem] text-[2.4rem] font-bold text-white">FAQ</h2>
        <div className="grid grid-cols-1 gap-[1rem] md:grid-cols-2">
          {FAQ.map(item => (
            <div key={item.q} className="rounded-[1.2rem] bg-[#0f0f0f] p-[1.4rem] sm:p-[1.6rem]">
              <h3 className="mb-[0.6rem] text-[1.4rem] font-semibold text-white">{item.q}</h3>
              <p className="text-[1.25rem] leading-relaxed text-white/45">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="surface-elevated rounded-[1.6rem] bg-[#141414] p-[2rem] text-center sm:p-[3.2rem]">
        <h2 className="mb-[0.8rem] text-[2.4rem] font-bold text-white sm:text-[2.8rem]">Ready to reflow?</h2>
        <p className="mx-auto mb-[2rem] max-w-[42rem] text-[1.35rem] text-white/45">
          Launch on the curve, graduate to a vault-locked pool, and keep dead liquidity in motion.
        </p>
        <div className="flex flex-col items-center justify-center gap-[1rem] sm:flex-row">
          <HoverButton isLink href="/launch">
            Launch
          </HoverButton>
          <HoverButton isLink href="/" variant="outline">
            Explore
          </HoverButton>
          <HoverButton isLink href="/leaderboards" variant="outline">
            Leaderboards
          </HoverButton>
        </div>
      </section>
    </div>
  );
}
