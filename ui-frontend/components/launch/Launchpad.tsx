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

const STEPS = [
  { id: 1, label: "Details", hint: "Name & symbol" },
  { id: 2, label: "Media", hint: "Image & links" },
  { id: 3, label: "Curve", hint: "Seed buy" },
  { id: 4, label: "Launch", hint: "Review" },
] as const;

const PRESET_IMAGES = [
  { src: "/coins/token1.webp", label: "Fox" },
  { src: "/coins/token2.jpeg", label: "Dragon" },
  { src: "/coins/token3.png", label: "Jade" },
  { src: "/coins/token4.jpeg", label: "Otter" },
  { src: "/coins/token5.avif", label: "Prime" },
  { src: "/zuno-logo.png", label: "ZUNO" },
];

type FormState = {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  twitter: string;
  telegram: string;
  website: string;
  seedBuy: string;
};

const INITIAL: FormState = {
  name: "",
  symbol: "",
  description: "",
  imageUrl: PRESET_IMAGES[0].src,
  twitter: "",
  telegram: "",
  website: "",
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
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [launched, setLaunched] = useState<{
    address: string;
    name: string;
    symbol: string;
    imageUrl: string;
  } | null>(null);

  const canNext = useMemo(() => {
    if (step === 1) return form.name.trim().length >= 2 && form.symbol.trim().length >= 2;
    if (step === 2) return !!form.imageUrl;
    if (step === 3) return Number(form.seedBuy) >= 0;
    return true;
  }, [step, form]);

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
              description: form.description,
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
          // Best-effort full sync so Explore picks up other chain tokens too
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
        <div className="tabs-wrapper max-w-[72rem] mx-auto items-center text-center gap-[2.4rem] py-[4rem]">
          <div className="size-[6.4rem] rounded-full bg-accent-500/15 border border-accent-500/40 grid place-content-center">
            <Check className="size-[2.8rem] text-accent-500" />
          </div>
          <div className="space-y-[0.8rem]">
            <p className="text-accent-500 font-mono text-[1.1rem] uppercase tracking-[0.16em]">Launched</p>
            <h1 className="text-[2.8rem] sm:text-[4rem] font-bold leading-tight">
              {launched.name} <span className="text-accent-500">${launched.symbol}</span>
            </h1>
            <p className="text-white/60 text-[1.2rem] sm:text-[1.4rem] max-w-[42rem] mx-auto">
              Your bonding curve is live on Arc Testnet. Share the token and invite early buyers.
            </p>
          </div>
          <div className="relative size-[12rem] rounded-md overflow-hidden border border-white/10 bg-white/5">
            <Image src={launched.imageUrl} alt={launched.name} fill className="object-cover" unoptimized />
          </div>
          <div className="w-full max-w-[48rem] rounded-sm border border-white/10 bg-black/35 px-[1.6rem] py-[1.2rem] font-mono text-[1.1rem] sm:text-[1.3rem] text-white/80 break-all">
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
                setStep(1);
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
      <div className="mb-[2.4rem] sm:mb-[3.2rem] space-y-[1.2rem]">
        <div className="flex items-center gap-[0.8rem] text-accent-500">
          <Rocket className="size-[1.6rem]" />
          <span className="font-mono text-[1.1rem] uppercase tracking-[0.16em]">Token launchpad</span>
        </div>
        <h1 className="text-[2.8rem] sm:text-[4.4rem] font-bold leading-none">
          Launch on the <span className="text-accent-500">bonding curve</span>
        </h1>
        <p className="text-white/60 text-[1.2rem] sm:text-[1.5rem] max-w-[56rem]">
          Create a token, seed the curve, and graduate later. Launches write to Core.createCurve on Arc Testnet.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_32rem] gap-[1.6rem] sm:gap-[2.4rem]">
        <section className="tabs-wrapper gap-[2.4rem]">
          <ol className="flex flex-wrap gap-[0.8rem]">
            {STEPS.map(s => {
              const active = step === s.id;
              const done = step > s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setStep(s.id)}
                    className={cn(
                      "flex items-center gap-[0.8rem] rounded-full border px-[1.2rem] py-[0.7rem] text-[1.1rem] transition-colors",
                      active
                        ? "border-accent-500/50 bg-accent-500/10 text-accent-500"
                        : done
                          ? "border-white/20 bg-white/5 text-white"
                          : "border-white/10 text-white/40",
                    )}
                  >
                    <span
                      className={cn(
                        "size-[1.8rem] rounded-full grid place-content-center text-[1rem] font-bold",
                        active || done ? "bg-accent-500 text-primary-800" : "bg-white/10",
                      )}
                    >
                      {done ? <Check className="size-[1rem]" /> : s.id}
                    </span>
                    <span className="hidden sm:inline font-medium">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          {step === 1 && (
            <div className="grid gap-[1.6rem] sm:grid-cols-2">
              <Field label="Token name" hint="At least 2 characters">
                <input
                  className={inputClass}
                  placeholder="e.g. ZUNO Frog"
                  value={form.name}
                  onChange={e => update("name", e.target.value)}
                />
              </Field>
              <Field label="Symbol" hint="Ticker, uppercase preferred">
                <input
                  className={inputClass}
                  placeholder="e.g. FROG"
                  value={form.symbol}
                  maxLength={10}
                  onChange={e => update("symbol", e.target.value.toUpperCase())}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description">
                  <textarea
                    className={cn(inputClass, "min-h-[12rem] resize-y")}
                    placeholder="What is this token about?"
                    value={form.description}
                    onChange={e => update("description", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-[2rem]">
              <Field label="Token image">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-[0.8rem]">
                  {PRESET_IMAGES.map(img => {
                    const selected = form.imageUrl === img.src;
                    return (
                      <button
                        key={img.src}
                        type="button"
                        onClick={() => update("imageUrl", img.src)}
                        className={cn(
                          "relative aspect-square rounded-sm overflow-hidden border transition-colors",
                          selected ? "border-accent-500 ring-1 ring-accent-500/40" : "border-white/10 hover:border-white/30",
                        )}
                      >
                        <Image src={img.src} alt={img.label} fill className="object-cover" unoptimized sizes="80px" />
                      </button>
                    );
                  })}
                </div>
              </Field>
              <div className="rounded-sm border border-dashed border-white/15 bg-black/20 px-[1.6rem] py-[2rem] flex flex-col items-center gap-[0.8rem] text-white/50">
                <Upload className="size-[2rem]" />
                <p className="text-[1.2rem]">Pick a preset image or paste an image URL</p>
              </div>
              <div className="grid gap-[1.6rem] sm:grid-cols-3">
                <Field label="Twitter / X">
                  <input
                    className={inputClass}
                    placeholder="@handle"
                    value={form.twitter}
                    onChange={e => update("twitter", e.target.value)}
                  />
                </Field>
                <Field label="Telegram">
                  <input
                    className={inputClass}
                    placeholder="t.me/..."
                    value={form.telegram}
                    onChange={e => update("telegram", e.target.value)}
                  />
                </Field>
                <Field label="Website">
                  <input
                    className={inputClass}
                    placeholder="https://"
                    value={form.website}
                    onChange={e => update("website", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-[2rem]">
              <Field
                label="Seed buy (USDC)"
                hint="Optional first buy when the curve is created. Trade fee ~1%."
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
                  { label: "Listing target", value: "~800M tokens sold" },
                  { label: "Deploy fee", value: "0 USDC" },
                  { label: "Trading fee", value: "1%" },
                ].map(stat => (
                  <div key={stat.label} className="rounded-sm border border-white/10 bg-black/25 px-[1.4rem] py-[1.2rem]">
                    <p className="text-[1rem] uppercase tracking-[0.14em] text-white/40">{stat.label}</p>
                    <p className="mt-[0.6rem] text-[1.4rem] font-semibold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-sm border border-accent-500/20 bg-accent-500/5 px-[1.6rem] py-[1.4rem] flex gap-[1rem]">
                <Sparkles className="size-[1.8rem] text-accent-500 shrink-0 mt-[0.2rem]" />
                <p className="text-[1.2rem] text-white/70 leading-relaxed">
                  After launch, buyers push the curve toward the target. Anyone can call listing once locked — LP goes to
                  the recycling vault.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-[2rem]">
              <div className="flex flex-col sm:flex-row gap-[1.6rem] items-start">
                <div className="relative size-[10rem] rounded-md overflow-hidden border border-white/10 bg-white/5 shrink-0">
                  {form.imageUrl ? (
                    <Image src={form.imageUrl} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="size-full grid place-content-center text-white/30">
                      <ImagePlus className="size-[2.4rem]" />
                    </div>
                  )}
                </div>
                <div className="space-y-[0.6rem]">
                  <h2 className="text-[2.4rem] font-bold leading-tight">
                    {form.name || "Unnamed"}{" "}
                    <span className="text-accent-500">${form.symbol || "???"}</span>
                  </h2>
                  <p className="text-white/60 text-[1.2rem] max-w-[40rem]">
                    {form.description || "No description provided."}
                  </p>
                  <p className="font-mono text-[1.2rem] text-white/80">Seed buy: {form.seedBuy || "0"} USDC</p>
                </div>
              </div>
              <ul className="space-y-[0.8rem] text-[1.2rem] text-white/65">
                <li className="flex gap-[0.8rem]">
                  <Check className="size-[1.4rem] text-accent-500 shrink-0 mt-[0.2rem]" />
                  Bonding curve created with factory defaults
                </li>
                <li className="flex gap-[0.8rem]">
                  <Check className="size-[1.4rem] text-accent-500 shrink-0 mt-[0.2rem]" />
                  Token appears under Tokens → Pre-buy / Upcoming
                </li>
                <li className="flex gap-[0.8rem]">
                  <Check className="size-[1.4rem] text-accent-500 shrink-0 mt-[0.2rem]" />
                  Connect your wallet to sign the create transaction
                </li>
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-[1.2rem] pt-[0.8rem] border-t border-white/10">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep(s => Math.max(1, s - 1))}
              className="text-[1.2rem] text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Back
            </button>
            <div className="flex gap-[1rem]">
              {step < 4 ? (
                <HoverButton disabled={!canNext} handleOnClick={() => setStep(s => Math.min(4, s + 1))}>
                  Continue
                </HoverButton>
              ) : isConnected ? (
                <HoverButton disabled={submitting || !canNext} handleOnClick={launch}>
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
              ) : (
                <ConnectWalletButton className="hover:bg-accent-600">Connect to launch</ConnectWalletButton>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-[1.6rem]">
          <div className="tabs-wrapper gap-[1.6rem]">
            <p className="text-[1rem] uppercase tracking-[0.16em] text-white/40">Live preview</p>
            <div className="relative aspect-square max-w-[22rem] mx-auto w-full rounded-md overflow-hidden border border-white/10 bg-white/5">
              {form.imageUrl ? (
                <Image src={form.imageUrl} alt="preview" fill className="object-cover" unoptimized />
              ) : (
                <div className="size-full grid place-content-center text-white/25">
                  <ImagePlus className="size-[3rem]" />
                </div>
              )}
            </div>
            <div>
              <p className="text-[2rem] font-bold leading-tight">{form.name || "Token name"}</p>
              <p className="text-accent-500 font-mono text-[1.4rem]">${form.symbol || "TICKER"}</p>
            </div>
            <p className="text-[1.2rem] text-white/50 line-clamp-4">
              {form.description || "Description will show here as you type."}
            </p>
          </div>

          <div className="rounded-md border border-white/10 bg-white/5 p-[1.6rem] space-y-[1rem]">
            <p className="font-medium text-[1.3rem]">After launch</p>
            <ol className="space-y-[0.8rem] text-[1.15rem] text-white/55 list-decimal list-inside">
              <li>Buy on the curve until lock</li>
              <li>Graduate to Uniswap V2</li>
              <li>Trade via DexRouter</li>
              <li>Recycle inactive LP later</li>
            </ol>
            <Link href="/guide" className="inline-block text-accent-500 text-[1.2rem] hover:underline">
              Read the guide →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
