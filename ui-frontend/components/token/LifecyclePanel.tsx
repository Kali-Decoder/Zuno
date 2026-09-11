"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import HoverButton from "~~/components/common/HoverButton";
import { Spinner } from "~~/components/common/Spinner";
import {
  derivePhaseFromLifecycle,
  executeProposal,
  getTokenLifecycle,
  launchPool,
  loadLockedCandidates,
  markTokenInactive,
  proposeRecycle,
  voteOnProposal,
  type TokenLifecycle,
} from "~~/lib/reflow/actions";
import { persistTokenPatch, lifecyclePersistBody } from "~~/lib/tokens/adapters";
import { decodeCallError } from "~~/lib/reflow/tx";
import { useReflowWallet } from "~~/hooks/useReflowWallet";
import { isOperatorAddress } from "~~/config/reflow";
import { cn } from "~~/lib/utils";
import { shortenAddress } from "~~/utils/addressShort";

const PHASE_COPY: Record<string, { title: string; body: string }> = {
  bonding: {
    title: "Bonding curve",
    body: "Buy and sell on the curve until the graduation target is hit.",
  },
  locked: {
    title: "Ready to graduate",
    body: "Target reached. An operator can launch the Uniswap pool and lock LP in the vault.",
  },
  listed: {
    title: "Pool live",
    body: "Trading on the DEX. LP is locked in the recycling vault.",
  },
  inactive: {
    title: "Inactive pool",
    body: "Activity fell below threshold. An operator can propose recycling into a healthier token.",
  },
  voting: {
    title: "Recycling vote",
    body: "Operator may stake MON to vote which listed token receives the recycled liquidity.",
  },
  recycling: {
    title: "Recycling",
    body: "Winning proposal is being executed.",
  },
  recycled: {
    title: "Recycled",
    body: "Liquidity moved to the winning candidate.",
  },
};

function PhaseBadge({ phase }: { phase: string }) {
  const colors: Record<string, string> = {
    bonding: "bg-white/10 text-white/70",
    locked: "bg-yellow-500/20 text-yellow-300",
    listed: "bg-emerald-500/20 text-emerald-300",
    inactive: "bg-orange-500/20 text-orange-300",
    voting: "bg-accent-500/20 text-accent-500",
    recycling: "bg-sky-500/20 text-sky-300",
    recycled: "bg-white/10 text-white/50",
  };
  return (
    <span className={cn("rounded-full px-[1rem] py-[0.4rem] text-[1.1rem] font-medium capitalize", colors[phase] || colors.bonding)}>
      {phase}
    </span>
  );
}

export default function LifecyclePanel({
  tokenAddress,
  tokenName,
  tokenSymbol,
  initialCurve,
  onUpdated,
}: {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  initialCurve?: string;
  onUpdated?: () => void;
}) {
  const wallet = useReflowWallet();
  const canOperate = isOperatorAddress(wallet.account);
  const [life, setLife] = useState<TokenLifecycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [candidates, setCandidates] = useState<{ address: string; name: string; symbol: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [voteCandidate, setVoteCandidate] = useState("");
  const [stake, setStake] = useState("0.01");

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getTokenLifecycle(tokenAddress);
      if (!data.curve && initialCurve) data.curve = initialCurve;
      setLife(data);
      const phase = derivePhaseFromLifecycle(data);
      await persistTokenPatch(
        lifecyclePersistBody(tokenAddress, tokenName, tokenSymbol, data, phase),
      );
      onUpdated?.();
    } catch {
      setLife(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenAddress]);

  useEffect(() => {
    if (!life) return;
    const phase = derivePhaseFromLifecycle(life);
    if (phase === "inactive" || phase === "voting" || life.recyclingEligible) {
      void loadLockedCandidates(tokenAddress).then(setCandidates);
    }
  }, [life, tokenAddress]);

  const withSigner = async (label: string, action: (signer: import("ethers").Signer) => Promise<void>) => {
    if (!isOperatorAddress(wallet.account)) {
      toast.error("Operator wallet required.");
      return;
    }
    setBusy(true);
    try {
      const ok = await wallet.runWrite(async signer => {
        await action(signer);
      });
      if (ok) {
        toast.success(label);
        await refresh();
      }
    } catch (e) {
      const msg = decodeCallError(e, label);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !life) {
    return (
      <section className="rounded-[1.8rem] border border-white/[0.06] bg-[#121212] p-[1.6rem] sm:p-[2rem]">
        <div className="flex items-center gap-[0.8rem] text-white/40">
          <Spinner /> Loading lifecycle…
        </div>
      </section>
    );
  }

  if (!life) return null;

  const phase = derivePhaseFromLifecycle(life);
  const copy = PHASE_COPY[phase] || PHASE_COPY.bonding;

  const toggleCandidate = (addr: string) => {
    setSelected(prev => (prev.includes(addr) ? prev.filter(a => a !== addr) : [...prev, addr].slice(0, 5)));
  };

  return (
    <section className="rounded-[1.8rem] border border-white/[0.06] bg-[#121212] p-[1.6rem] sm:p-[2rem]">
      <div className="mb-[1.4rem] flex flex-col gap-[1rem] sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-[0.45rem]">
          <div className="flex flex-wrap items-center gap-[0.8rem]">
            <h2 className="text-[1.7rem] font-semibold text-white sm:text-[1.9rem]">Lifecycle</h2>
            <PhaseBadge phase={phase} />
          </div>
          <p className="max-w-[48rem] text-[1.2rem] text-white/40">{copy.body}</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-full border border-white/[0.08] bg-transparent px-[1.2rem] py-[0.55rem] text-[1.1rem] text-white/50 transition-colors hover:border-white/20 hover:text-white"
        >
          Refresh
        </button>
      </div>

      {!life.listed && (
        <div className="mb-[1.4rem]">
          <div className="mb-[0.55rem] flex items-center justify-between text-[1.1rem] text-white/40">
            <span>Graduation</span>
            <span className="tabular-nums text-accent-500">{life.progress.toFixed(1)}%</span>
          </div>
          <div className="h-[0.35rem] overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-accent-500 transition-[width] duration-500"
              style={{ width: `${Math.min(100, life.progress)}%` }}
            />
          </div>
        </div>
      )}

      <div className="mb-[1.4rem] grid grid-cols-2 gap-[0.8rem] sm:grid-cols-4">
        <Meta label="Curve" value={life.curve ? shortenAddress(life.curve) : "—"} />
        <Meta
          label={life.pair ? "Pair" : "Curve MON"}
          value={
            life.pair
              ? shortenAddress(life.pair)
              : life.reserveNative && life.reserveNative !== "0"
                ? `${Number(Number(life.reserveNative) / 1e18).toFixed(2)} MON`
                : "—"
          }
        />
        <Meta label="Vault" value={life.vaultStatus} />
        <Meta
          label="Activity"
          value={
            life.recyclingEligible
              ? "Eligible"
              : life.inactive
                ? "Inactive"
                : life.txCountInWindow > 0
                  ? `${life.txCountInWindow} txs`
                  : "Active"
          }
        />
      </div>

      <div className="flex flex-col gap-[1rem]">
        {canOperate && !life.listed && life.curve && (life.locked || life.progress >= 99) && (
          <div className="space-y-[0.6rem]">
            <HoverButton
              className="w-full sm:w-auto"
              handleOnClick={() =>
                void withSigner("Pool launched", async signer => {
                  await launchPool({
                    signer,
                    account: wallet.account,
                    tokenAddress,
                    curveAddress: life.curve,
                  });
                })
              }
            >
              <span className="inline-flex items-center gap-[0.6rem]">
                {life.locked ? "Launch pool" : "Buy to lock & launch"} {busy && <Spinner />}
              </span>
            </HoverButton>
            {!life.locked && (
              <p className="text-[1.15rem] text-white/40">
                Curve is at {life.progress.toFixed(1)}% — this buys the last tokens to lock, then lists the pool.
              </p>
            )}
          </div>
        )}

        {canOperate && phase === "listed" && (
          <HoverButton
            className="w-full sm:w-auto"
            handleOnClick={() =>
              void withSigner("Marked inactive", async signer => {
                await markTokenInactive({ signer, tokenAddress });
              })
            }
          >
            <span className="inline-flex items-center gap-[0.6rem]">
              Mark inactive {busy && <Spinner />}
            </span>
          </HoverButton>
        )}

        {canOperate && (phase === "inactive" || (life.recyclingEligible && !life.proposalId)) && (
          <div className="space-y-[1rem] rounded-[1.2rem] bg-[#0f0f0f] p-[1.4rem]">
            <p className="text-[1.3rem] font-medium text-white">Propose recycle</p>
            <p className="text-[1.15rem] text-white/40">
              Select up to 5 locked listed tokens that can receive this LP.
            </p>
            <div className="flex max-h-[16rem] flex-col gap-[0.5rem] overflow-y-auto">
              {candidates.length === 0 && (
                <p className="text-[1.2rem] text-white/35">No locked candidate tokens found yet.</p>
              )}
              {candidates.map(c => {
                const on = selected.includes(c.address);
                return (
                  <button
                    key={c.address}
                    type="button"
                    onClick={() => toggleCandidate(c.address)}
                    className={cn(
                      "flex items-center justify-between rounded-[0.8rem] px-[1rem] py-[0.8rem] text-left text-[1.2rem]",
                      on ? "bg-accent-500/20 text-accent-500" : "bg-white/5 text-white/70 hover:bg-white/10",
                    )}
                  >
                    <span>
                      {c.name} <span className="text-white/40">${c.symbol}</span>
                    </span>
                    <span className="font-mono text-[1.05rem] opacity-60">{shortenAddress(c.address)}</span>
                  </button>
                );
              })}
            </div>
            <HoverButton
              className="w-full sm:w-auto"
              handleOnClick={() =>
                void withSigner("Proposal created", async signer => {
                  await proposeRecycle({ signer, deadToken: tokenAddress, candidates: selected });
                })
              }
            >
              <span className="inline-flex items-center gap-[0.6rem]">
                Create proposal {busy && <Spinner />}
              </span>
            </HoverButton>
          </div>
        )}

        {canOperate && life.proposalId != null && life.proposalState && life.proposalState !== "Executed" && (
          <div className="space-y-[1rem] rounded-[1.2rem] bg-[#0f0f0f] p-[1.4rem]">
            <div className="flex flex-wrap items-center gap-[0.8rem]">
              <p className="text-[1.3rem] font-medium text-white">Proposal #{life.proposalId}</p>
              <PhaseBadge phase={life.proposalState.toLowerCase()} />
            </div>

            {life.proposalState === "Active" && (
              <>
                <div className="flex flex-col gap-[0.5rem]">
                  {life.proposalCandidates.map(addr => (
                    <button
                      key={addr}
                      type="button"
                      onClick={() => setVoteCandidate(addr)}
                      className={cn(
                        "rounded-[0.8rem] px-[1rem] py-[0.8rem] text-left font-mono text-[1.15rem]",
                        voteCandidate === addr
                          ? "bg-accent-500/20 text-accent-500"
                          : "bg-white/5 text-white/70",
                      )}
                    >
                      {shortenAddress(addr)}
                    </button>
                  ))}
                </div>
                <label className="block text-[1.15rem] text-white/45">
                  Stake (MON)
                  <input
                    value={stake}
                    onChange={e => setStake(e.target.value)}
                    className="mt-[0.4rem] w-full rounded-[0.8rem] border border-white/10 bg-[#141414] px-[1rem] py-[0.8rem] text-[1.3rem] text-white outline-none focus:border-accent-500/50"
                    placeholder={life.minVoteStake}
                  />
                </label>
                <HoverButton
                  className="w-full sm:w-auto"
                  handleOnClick={() =>
                    void withSigner("Vote cast", async signer => {
                      if (!voteCandidate) throw new Error("Select a candidate");
                      await voteOnProposal({
                        signer,
                        proposalId: life.proposalId!,
                        candidate: voteCandidate,
                        stakeMon: stake || life.minVoteStake,
                      });
                    })
                  }
                >
                  <span className="inline-flex items-center gap-[0.6rem]">
                    Vote {busy && <Spinner />}
                  </span>
                </HoverButton>
              </>
            )}

            {life.proposalState === "Succeeded" && (
              <HoverButton
                className="w-full sm:w-auto"
                handleOnClick={() =>
                  void withSigner("Recycle executed", async signer => {
                    await executeProposal({ signer, proposalId: life.proposalId! });
                  })
                }
              >
                <span className="inline-flex items-center gap-[0.6rem]">
                  Execute recycle {busy && <Spinner />}
                </span>
              </HoverButton>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-white/[0.05] bg-white/[0.02] px-[1.1rem] py-[0.9rem]">
      <p className="text-[1.05rem] uppercase tracking-[0.05em] text-white/30">{label}</p>
      <p className="mt-[0.3rem] truncate text-[1.25rem] font-medium tabular-nums text-white/90">{value}</p>
    </div>
  );
}
