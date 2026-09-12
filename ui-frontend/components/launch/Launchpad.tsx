"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Check, ImagePlus, Rocket, Sparkles, Upload } from "lucide-react";
import toast from "react-hot-toast";
import ConnectWalletButton from "~~/components/common/ConnectWalletButton";
import HoverButton from "~~/components/common/HoverButton";
import { Spinner } from "~~/components/common/Spinner";
import { useReflowWallet } from "~~/hooks/useReflowWallet";
import { createTokenCurve } from "~~/lib/reflow/actions";
import { decodeCallError } from "~~/lib/reflow/tx";
import { cn } from "~~/lib/utils";

const PRESET_IMAGES = [
  { src: "/coins/token1.webp", label: "Fox" },
  { src: "/coins/token2.jpeg", label: "Dragon" },
  { src: "/coins/token3.png", label: "Jade" },
  { src: "/coins/token4.jpeg", label: "Otter" },
  { src: "/coins/token5.avif", label: "Prime" },
  { src: "/avatars/memo_1.png", label: "Memo" },
  { src: "/avatars/notion_1.png", label: "Notion" },
  { src: "/avatars/vibrent_1.png", label: "Vibrent" },
  { src: "/avatars/bluey_1.png", label: "Bluey" },
  { src: "/zuno-logo.png", label: "ZUNO" },
];

/** Fields required by Core.createCurve (+ seed amountIn/fee). */
type FormState = {
  name: string;
  symbol: string;
  imageUrl: string;
  seedBuy: string;
};

const INITIAL: FormState = {
  name: "",
  symbol: "",
  imageUrl: PRESET_IMAGES[0].src,
  seedBuy: "1",
};

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-[0.8rem]">
      <span className="text-[1.1rem] sm:text-[1.2rem] font-medium text-white/70">{label}</span>
      {children}
      {hint ? <span className="text-[1rem] text-white/40">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-sm border border-white/10 bg-black/35 px-[1.2rem] py-[1rem] text-[1.2rem] sm:text-[1.4rem] text-white placeholder:text-white/30 outline-none focus:border-accent-500/50 transition-colors";

export default function Launchpad() {
  const { isConnected } = useAccount();
  const wallet = useReflowWallet();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [launched, setLaunched] = useState<{
    address: string;
    name: string;
    symbol: string;
    imageUrl: string;
  } | null>(null);

  const canLaunch = useMemo(
    () => form.name.trim().length >= 2 && form.symbol.trim().length >= 2 && !!form.imageUrl && Number(form.seedBuy) >= 0,
    [form],
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const launch = async () => {
    if (!isConnected || !wallet.account) {
      toast.error("Connect wallet to launch");
      return;
    }
    if (!wallet.isCorrectNetwork) {
      toast.error("Switch to Arc Testnet");
      await wallet.switchToArc();
      return;
    }

    setSubmitting(true);
    try {
      let resultAddress = "";
      const ok = await wallet.runWrite(async signer => {
        const result = await createTokenCurve({
          signer,
          creator: wallet.account,
          name: form.name.trim(),
          symbol: form.symbol.trim().toUpperCase(),
          tokenURI: form.imageUrl || "ipfs://zuno",
          seedBuy: form.seedBuy,
        });
        resultAddress = result.token;

        try {
          await fetch("/api/tokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: result.token,
              name: result.name,
              symbol: result.symbol,
              curve: result.curve,
              imageUrl: form.imageUrl,
              creator: wallet.account,
              tokenURI: form.imageUrl,
              graduated: false,
              phase: "bonding",
              vaultStatus: "None",
              progress: Number(form.seedBuy) > 0 ? 1 : 0,
              lastBuyAt: new Date().toISOString(),
              lifecycleSyncedAt: new Date().toISOString(),
            }),
          });
          void fetch("/api/tokens/sync", { method: "POST" });
        } catch {
          /* Mongo optional — launch still succeeds on-chain */
        }
      });

      if (ok && resultAddress) {
        setLaunched({
          address: resultAddress,
          name: form.name.trim(),
          symbol: form.symbol.trim().toUpperCase(),
          imageUrl: form.imageUrl,
        });
        toast.success("Token launched on Arc Testnet");
      }
    } catch (error) {
      toast.error(decodeCallError(error, "createCurve"));
    } finally {
      setSubmitting(false);
    }
  };

  if (launched) {
    return (
      <div className="page-container pb-[6rem]">
        <div className="tabs-wrapper mx-auto max-w-[72rem] items-center gap-[2.4rem] py-[4rem] text-center">
          <div className="grid size-[6.4rem] place-content-center rounded-full border border-accent-500/40 bg-accent-500/15">
            <Check className="size-[2.8rem] text-accent-500" />
          </div>
          <div className="space-y-[0.8rem]">
            <p className="font-mono text-[1.1rem] uppercase tracking-[0.16em] text-accent-500">Launched</p>
            <h1 className="text-[2.8rem] font-bold leading-tight sm:text-[4rem]">
              {launched.name} <span className="text-accent-500">${launched.symbol}</span>
            </h1>
            <p className="mx-auto max-w-[42rem] text-[1.2rem] text-white/60 sm:text-[1.4rem]">
              Your bonding curve is live on Arc Testnet. Share the token and invite early buyers.
            </p>
          </div>
          <div className="relative size-[12rem] overflow-hidden rounded-md border border-white/10 bg-white/5">
            <Image src={launched.imageUrl} alt={launched.name} fill className="object-cover" unoptimized />
          </div>
          <div className="w-full max-w-[48rem] break-all rounded-sm border border-white/10 bg-black/35 px-[1.6rem] py-[1.2rem] font-mono text-[1.1rem] text-white/80 sm:text-[1.3rem]">
            {launched.address}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-[1.2rem]">
            <HoverButton isLink href={`/token/${launched.address}`}>
              Open token
            </HoverButton>
            <HoverButton isLink href="/" variant="outline">
              Explore
            </HoverButton>
            <HoverButton
              variant="outline"
              handleOnClick={() => {
                setLaunched(null);
                setForm(INITIAL);
              }}
            >
              Launch another
            </HoverButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container pb-[6rem]">
      <div className="mb-[2.4rem] space-y-[1.2rem] sm:mb-[3.2rem]">
        <div className="flex items-center gap-[0.8rem] text-accent-500">
          <Rocket className="size-[1.6rem]" />
          <span className="font-mono text-[1.1rem] uppercase tracking-[0.16em]">Token launchpad</span>
        </div>
        <h1 className="text-[2.8rem] font-bold leading-none sm:text-[4.4rem]">
          Launch on the <span className="text-accent-500">bonding curve</span>
        </h1>
        <p className="max-w-[56rem] text-[1.2rem] text-white/60 sm:text-[1.5rem]">
          Create a token, seed the curve, and graduate later. Launches write to Core.createCurve on Arc Testnet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[1.6rem] sm:gap-[2.4rem] lg:grid-cols-[minmax(0,1fr)_32rem]">
        <section className="tabs-wrapper gap-[2.4rem]">
          <div className="grid gap-[1.6rem] sm:grid-cols-2">
            <Field label="Token name" hint="Passed to createCurve — at least 2 characters">
              <input
                className={inputClass}
                placeholder="e.g. ZUNO Frog"
                value={form.name}
                onChange={e => update("name", e.target.value)}
              />
            </Field>
            <Field label="Symbol" hint="On-chain ticker">
              <input
                className={inputClass}
                placeholder="e.g. FROG"
                value={form.symbol}
                maxLength={10}
                onChange={e => update("symbol", e.target.value.toUpperCase())}
              />
            </Field>
          </div>

          <Field label="Token image" hint="Stored on-chain as tokenURI">
            <div className="grid grid-cols-3 gap-[0.8rem] sm:grid-cols-6">
              {PRESET_IMAGES.map(img => {
                const selected = form.imageUrl === img.src;
                return (
                  <button
                    key={img.src}
                    type="button"
                    onClick={() => update("imageUrl", img.src)}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-sm border transition-colors",
                      selected
                        ? "border-accent-500 ring-1 ring-accent-500/40"
                        : "border-white/10 hover:border-white/30",
                    )}
                  >
                    <Image src={img.src} alt={img.label} fill className="object-cover" unoptimized sizes="80px" />
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="space-y-[1.2rem] rounded-sm border border-dashed border-white/15 bg-black/20 px-[1.6rem] py-[1.6rem]">
            <div className="flex flex-col items-center gap-[0.8rem] text-white/50">
              <Upload className="size-[2rem]" />
              <p className="text-[1.2rem]">Pick a preset or paste an image URL</p>
            </div>
            <Field label="Image URL">
              <input
                className={inputClass}
                placeholder="https://… or ipfs://…"
                value={form.imageUrl}
                onChange={e => update("imageUrl", e.target.value)}
              />
            </Field>
          </div>

          <Field
            label="Seed buy (USDC)"
            hint="Optional first buy when the curve is created. Seed tokens are time-locked to protect investors from dev dumps."
          >
            <input
              className={inputClass}
              type="number"
              min={0}
              step="0.1"
              placeholder="1"
              value={form.seedBuy}
              onChange={e => update("seedBuy", e.target.value)}
            />
          </Field>

          <div className="grid gap-[1.2rem] sm:grid-cols-3">
            {[
              { label: "Listing target", value: "600M sold (60%)" },
              { label: "DEX LP Reserve", value: "400M tokens (40%)" },
              { label: "Trading fee", value: "1%" },
            ].map(stat => (
              <div key={stat.label} className="rounded-sm border border-white/10 bg-black/25 px-[1.4rem] py-[1.2rem]">
                <p className="text-[1rem] uppercase tracking-[0.14em] text-white/40">{stat.label}</p>
                <p className="mt-[0.6rem] text-[1.4rem] font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-[1rem] rounded-sm border border-accent-500/20 bg-accent-500/5 px-[1.6rem] py-[1.4rem]">
            <Sparkles className="mt-[0.2rem] size-[1.8rem] shrink-0 text-accent-500" />
            <p className="text-[1.2rem] leading-relaxed text-white/70">
              When 60% of tokens are sold, the curve graduates to Uniswap V2 with a deep 40% LP pool.
              LP is locked in the ZUNO recycling vault, and creator seed tokens remain securely time-locked.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-[1.2rem] border-t border-white/10 pt-[0.8rem]">
            {isConnected ? (
              !wallet.isCorrectNetwork ? (
                <HoverButton handleOnClick={() => void wallet.switchToArc()}>
                  <span className="inline-flex items-center gap-[0.6rem]">
                    Switch to Arc Testnet
                  </span>
                </HoverButton>
              ) : (
                <HoverButton disabled={submitting || !canLaunch} handleOnClick={launch}>
                  <span className="inline-flex items-center gap-[0.6rem]">
                    {submitting ? (
                      <>
                        Launching
                        <Spinner className="size-[1.4rem]" />
                      </>
                    ) : (
                      <>
                        Launch token
                        <Rocket className="size-[1.4rem]" />
                      </>
                    )}
                  </span>
                </HoverButton>
              )
            ) : (
              <ConnectWalletButton className="hover:bg-accent-600">Connect to launch</ConnectWalletButton>
            )}
          </div>
        </section>

        <aside className="space-y-[1.6rem]">
          <div className="tabs-wrapper gap-[1.6rem]">
            <p className="text-[1rem] uppercase tracking-[0.16em] text-white/40">Live preview</p>
            <div className="relative mx-auto aspect-square w-full max-w-[22rem] overflow-hidden rounded-md border border-white/10 bg-white/5">
              {form.imageUrl ? (
                <Image src={form.imageUrl} alt="preview" fill className="object-cover" unoptimized />
              ) : (
                <div className="grid size-full place-content-center text-white/25">
                  <ImagePlus className="size-[3rem]" />
                </div>
              )}
            </div>
            <div>
              <p className="text-[2rem] font-bold leading-tight">{form.name || "Token name"}</p>
              <p className="font-mono text-[1.4rem] text-accent-500">${form.symbol || "TICKER"}</p>
            </div>
            <p className="text-[1.2rem] text-white/50">Seed: {form.seedBuy || "0"} USDC</p>
          </div>

          <div className="space-y-[1rem] rounded-md border border-white/10 bg-white/5 p-[1.6rem]">
            <p className="text-[1.3rem] font-medium">After launch</p>
            <ol className="list-inside list-decimal space-y-[0.8rem] text-[1.15rem] text-white/55">
              <li>Buy on the curve until lock</li>
              <li>Graduate to Uniswap V2</li>
              <li>Trade via DexRouter</li>
              <li>Recycle inactive LP later</li>
            </ol>
            <Link href="/guide" className="inline-block text-[1.2rem] text-accent-500 hover:underline">
              Read the guide →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
