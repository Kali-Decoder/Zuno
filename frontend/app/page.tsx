"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { AlertTriangle, ExternalLink, RefreshCw, Wallet } from "lucide-react";
import { monadTestnet } from "@/app/config/chains";
import {
  CORE_ABI,
  CURVE_ABI,
  DEX_ROUTER_ABI,
  ERC20_ABI,
  FACTORY_ABI,
  GOVERNOR_ABI,
  MONITOR_ABI,
  PAIR_ABI,
  POSITION_STATUS,
  PROPOSAL_STATE,
  REFLOW,
  VAULT_ABI,
  v2AmountOut,
} from "@/app/config/reflow";
import { DataRow, Field, PrimaryButton, StatCard } from "@/app/components/ui";
import { useToastContext } from "@/app/contexts/ToastContext";
import { useWallet } from "@/app/hooks/useWallet";
import {
  calcFee,
  deadline,
  formatDateTime,
  formatDuration,
  formatToken,
  isSetAddress,
  shortAddress,
  txError,
  ZERO,
  ZERO_ADDRESS,
} from "@/app/lib/format";
import { loadTrackedTokens, saveTrackedToken, type TrackedToken } from "@/app/lib/tokens";

type StepId = 1 | 2 | 3 | 4 | 5;

const STEPS: { id: StepId; title: string; hint: string }[] = [
  { id: 1, title: "Launch", hint: "createCurve" },
  { id: 2, title: "Bonding curve", hint: "buy / sell until lock" },
  { id: 3, title: "Graduate", hint: "listing() → LP vault" },
  { id: 4, title: "DEX trade", hint: "DexRouter buy / sell" },
  { id: 5, title: "Recycle", hint: "inactive → vote → execute" },
];

type FactoryConfig = {
  deployFee: bigint;
  listingFee: bigint;
  tokenTotalSupply: bigint;
  virtualNative: bigint;
  virtualToken: bigint;
  k: bigint;
  targetToken: bigint;
  feeNumerator: bigint;
  feeDenominator: bigint;
};

type CurveState = {
  curve: string;
  locked: boolean;
  listed: boolean;
  pair: string;
  k: bigint;
  virtualNative: bigint;
  virtualToken: bigint;
  reserveNative: bigint;
  reserveToken: bigint;
  targetToken: bigint;
  feeDen: bigint;
  feeNum: bigint;
  name: string;
  symbol: string;
  decimals: number;
  walletBalance: bigint;
};

type VaultPosition = {
  token: string;
  pair: string;
  creator: string;
  liquidity: bigint;
  lockedAt: bigint;
  status: number;
};

type PoolActivity = {
  lastSwapAt: bigint;
  windowStartedAt: bigint;
  volumeNativeInWindow: bigint;
  txCountInWindow: bigint;
  inactive: boolean;
  recyclingEligible: boolean;
};

type ProposalView = {
  id: bigint;
  deadToken: string;
  candidates: string[];
  startTime: bigint;
  endTime: bigint;
  winner: string;
  executed: boolean;
  cancelled: boolean;
  state: number;
};

const EMPTY_CURVE: CurveState = {
  curve: "",
  locked: false,
  listed: false,
  pair: ZERO_ADDRESS,
  k: ZERO,
  virtualNative: ZERO,
  virtualToken: ZERO,
  reserveNative: ZERO,
  reserveToken: ZERO,
  targetToken: ZERO,
  feeDen: BigInt(1),
  feeNum: BigInt(100),
  name: "",
  symbol: "",
  decimals: 18,
  walletBalance: ZERO,
};

export default function Home() {
  const { showError, showInfo, showSuccess } = useToastContext();
  const wallet = useWallet();

  const [step, setStep] = useState<StepId>(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [factoryConfig, setFactoryConfig] = useState<FactoryConfig | null>(null);
  const [tracked, setTracked] = useState<TrackedToken[]>([]);
  const [tokenInput, setTokenInput] = useState("");
  const [selectedToken, setSelectedToken] = useState("");
  const [curveState, setCurveState] = useState<CurveState>(EMPTY_CURVE);
  const [position, setVaultPosition] = useState<VaultPosition | null>(null);
  const [activity, setActivity] = useState<PoolActivity | null>(null);
  const [nativeBalance, setNativeBalance] = useState(ZERO);

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [tokenURI, setTokenURI] = useState("ipfs://reflow");
  const [seedBuy, setSeedBuy] = useState("0");

  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");
  const [quoteOut, setQuoteOut] = useState<string>("");

  const [dexAmount, setDexAmount] = useState("");
  const [dexSide, setDexSide] = useState<"buy" | "sell">("buy");
  const [dexQuote, setDexQuote] = useState("");

  const [deadToken, setDeadToken] = useState("");
  const [candidateToken, setCandidateToken] = useState("");
  const [proposalId, setProposalId] = useState("");
  const [voteCandidate, setVoteCandidate] = useState("");
  const [voteStake, setVoteStake] = useState("0.01");
  const [proposal, setProposal] = useState<ProposalView | null>(null);
  const [minVoteStake, setMinVoteStake] = useState(ZERO);
  const [proposalCount, setProposalCount] = useState(ZERO);
  const [candidateVotes, setCandidateVotes] = useState<Record<string, bigint>>({});

  const contractsReady = isSetAddress(REFLOW.core) && isSetAddress(REFLOW.bondingCurveFactory);
  const tokenAddress = selectedToken || tokenInput;

  const progressPct = useMemo(() => {
    if (!factoryConfig || curveState.targetToken === ZERO) return 0;
    const supply = factoryConfig.tokenTotalSupply;
    const sold = supply > curveState.reserveToken ? supply - curveState.reserveToken : ZERO;
    const targetSold = supply > curveState.targetToken ? supply - curveState.targetToken : ZERO;
    if (targetSold === ZERO) return curveState.locked || curveState.listed ? 100 : 0;
    const pct = Number((sold * BigInt(10000)) / targetSold) / 100;
    return Math.max(0, Math.min(100, pct));
  }, [factoryConfig, curveState]);

  const loadFactory = useCallback(async () => {
    if (!wallet.ethereum || !contractsReady) return;
    const provider = wallet.getProvider();
    const factory = new ethers.Contract(REFLOW.bondingCurveFactory, FACTORY_ABI, provider);
    const cfg = await factory.getConfig();
    setFactoryConfig({
      deployFee: cfg.deployFee,
      listingFee: cfg.listingFee,
      tokenTotalSupply: cfg.tokenTotalSupply,
      virtualNative: cfg.virtualNative,
      virtualToken: cfg.virtualToken,
      k: cfg.k,
      targetToken: cfg.targetToken,
      feeNumerator: BigInt(cfg.feeNumerator),
      feeDenominator: BigInt(cfg.feeDenominator),
    });
    if (isSetAddress(REFLOW.governor)) {
      const governor = new ethers.Contract(REFLOW.governor, GOVERNOR_ABI, provider);
      const [stake, count] = await Promise.all([governor.minVoteStake(), governor.proposalCount()]);
      setMinVoteStake(stake);
      setProposalCount(count);
    }
  }, [contractsReady, wallet.ethereum, wallet.getProvider]);

  const refreshToken = useCallback(async () => {
    if (!wallet.ethereum || !contractsReady) return;
    const address = isSetAddress(tokenAddress) ? tokenAddress : "";
    if (!address) {
      setCurveState(EMPTY_CURVE);
      setVaultPosition(null);
      setActivity(null);
      return;
    }

    setIsRefreshing(true);
    try {
      const provider = wallet.getProvider();
      const factory = new ethers.Contract(REFLOW.bondingCurveFactory, FACTORY_ABI, provider);
      const curveAddr = (await factory.getCurve(address)) as string;
      if (!isSetAddress(curveAddr)) {
        setCurveState(EMPTY_CURVE);
        setVaultPosition(null);
        setActivity(null);
        showError("No bonding curve found for that token.");
        return;
      }

      const curve = new ethers.Contract(curveAddr, CURVE_ABI, provider);
      const token = new ethers.Contract(address, ERC20_ABI, provider);
      const [locked, listed, k, virtuals, reserves, target, feeCfg, pair, nameOnchain, symbolOnchain, decimals, bal] =
        await Promise.all([
          curve.getLock() as Promise<boolean>,
          curve.getIsListing() as Promise<boolean>,
          curve.getK() as Promise<bigint>,
          curve.getVirtualReserves() as Promise<[bigint, bigint]>,
          curve.getReserves() as Promise<[bigint, bigint]>,
          curve.getTargetToken() as Promise<bigint>,
          curve.getFeeConfig() as Promise<[number, number]>,
          curve.pair() as Promise<string>,
          token.name() as Promise<string>,
          token.symbol() as Promise<string>,
          token.decimals() as Promise<number>,
          wallet.account ? (token.balanceOf(wallet.account) as Promise<bigint>) : Promise.resolve(ZERO),
        ]);

      setCurveState({
        curve: curveAddr,
        locked,
        listed,
        pair,
        k,
        virtualNative: virtuals[0],
        virtualToken: virtuals[1],
        reserveNative: reserves[0],
        reserveToken: reserves[1],
        targetToken: target,
        feeDen: BigInt(feeCfg[0]),
        feeNum: BigInt(feeCfg[1]),
        name: nameOnchain,
        symbol: symbolOnchain,
        decimals: Number(decimals),
        walletBalance: bal,
      });

      if (wallet.account) {
        setNativeBalance(await provider.getBalance(wallet.account));
      }

      if (isSetAddress(REFLOW.lpVault)) {
        const vault = new ethers.Contract(REFLOW.lpVault, VAULT_ABI, provider);
        const pos = await vault.getPosition(address);
        setVaultPosition({
          token: pos.token,
          pair: pos.pair,
          creator: pos.creator,
          liquidity: pos.liquidity,
          lockedAt: pos.lockedAt,
          status: Number(pos.status),
        });
      }

      if (isSetAddress(REFLOW.activityMonitor)) {
        const monitor = new ethers.Contract(REFLOW.activityMonitor, MONITOR_ABI, provider);
        const a = await monitor.getActivity(address);
        setActivity({
          lastSwapAt: a.lastSwapAt,
          windowStartedAt: a.windowStartedAt,
          volumeNativeInWindow: a.volumeNativeInWindow,
          txCountInWindow: a.txCountInWindow,
          inactive: a.inactive,
          recyclingEligible: a.recyclingEligible,
        });
      }

      saveTrackedToken({
        address,
        name: nameOnchain,
        symbol: symbolOnchain,
        curve: curveAddr,
      });
      setTracked(loadTrackedTokens());
    } catch (error) {
      showError(txError(error));
    } finally {
      setIsRefreshing(false);
    }
  }, [contractsReady, showError, tokenAddress, wallet.account, wallet.ethereum, wallet.getProvider]);

  const refreshProposal = useCallback(async () => {
    if (!wallet.ethereum || !isSetAddress(REFLOW.governor) || !proposalId) {
      setProposal(null);
      return;
    }
    try {
      const provider = wallet.getProvider();
      const governor = new ethers.Contract(REFLOW.governor, GOVERNOR_ABI, provider);
      const id = BigInt(proposalId);
      const [p, state] = await Promise.all([governor.getProposal(id), governor.state(id)]);
      const view: ProposalView = {
        id: p.id,
        deadToken: p.deadToken,
        candidates: p.candidates,
        startTime: p.startTime,
        endTime: p.endTime,
        winner: p.winner,
        executed: p.executed,
        cancelled: p.cancelled,
        state: Number(state),
      };
      setProposal(view);
      const votes: Record<string, bigint> = {};
      await Promise.all(
        view.candidates.map(async (c) => {
          votes[c] = (await governor.votes(id, c)) as bigint;
        })
      );
      setCandidateVotes(votes);
    } catch (error) {
      showError(txError(error));
    }
  }, [proposalId, showError, wallet.ethereum, wallet.getProvider]);

  useEffect(() => {
    setTracked(loadTrackedTokens());
    loadFactory().catch((error) => showError(txError(error)));
  }, [loadFactory, showError]);

  useEffect(() => {
    if (!isSetAddress(tokenAddress)) return;
    refreshToken();
  }, [refreshToken, tokenAddress, wallet.account]);

  useEffect(() => {
    refreshProposal();
  }, [refreshProposal]);

  useEffect(() => {
    const updateQuote = async () => {
      setQuoteOut("");
      if (!wallet.ethereum || !contractsReady || !isSetAddress(tokenAddress) || !tradeAmount) return;
      try {
        const amount = ethers.parseEther(tradeAmount);
        if (amount <= ZERO) return;
        const provider = wallet.getProvider();
        const core = new ethers.Contract(REFLOW.core, CORE_ABI, provider);
        if (tradeSide === "buy") {
          const out = (await core.getAmountOut(
            amount,
            curveState.k,
            curveState.virtualNative,
            curveState.virtualToken
          )) as bigint;
          setQuoteOut(`${formatToken(out, curveState.decimals)} ${curveState.symbol || "tokens"}`);
        } else {
          const out = (await core.getAmountOut(
            ethers.parseUnits(tradeAmount, curveState.decimals),
            curveState.k,
            curveState.virtualToken,
            curveState.virtualNative
          )) as bigint;
          const fee = calcFee(out, curveState.feeDen, curveState.feeNum);
          setQuoteOut(`${formatToken(out - fee)} MON`);
        }
      } catch {
        setQuoteOut("—");
      }
    };
    updateQuote();
  }, [contractsReady, curveState, tokenAddress, tradeAmount, tradeSide, wallet.ethereum, wallet.getProvider]);

  useEffect(() => {
    const updateDexQuote = async () => {
      setDexQuote("");
      if (!wallet.ethereum || !curveState.listed || !dexAmount || !isSetAddress(curveState.pair)) return;
      try {
        const provider = wallet.getProvider();
        const pair = new ethers.Contract(curveState.pair, PAIR_ABI, provider);
        const [r0, r1] = (await pair.getReserves()) as [bigint, bigint, number];
        const token0 = (await pair.token0()) as string;
        const nativeIs0 = token0.toLowerCase() === REFLOW.wNative.toLowerCase();
        const reserveNative = nativeIs0 ? r0 : r1;
        const reserveToken = nativeIs0 ? r1 : r0;
        if (dexSide === "buy") {
          const amountIn = ethers.parseEther(dexAmount);
          const out = v2AmountOut(amountIn, reserveNative, reserveToken);
          setDexQuote(`${formatToken(out, curveState.decimals)} ${curveState.symbol || "tokens"}`);
        } else {
          const amountIn = ethers.parseUnits(dexAmount, curveState.decimals);
          const out = v2AmountOut(amountIn, reserveToken, reserveNative);
          const router = new ethers.Contract(REFLOW.dexRouter, DEX_ROUTER_ABI, provider);
          const [den, num] = (await router.getFeeConfig()) as [bigint, bigint];
          const fee = calcFee(out, den, num);
          setDexQuote(`${formatToken(out - fee)} MON`);
        }
      } catch {
        setDexQuote("—");
      }
    };
    updateDexQuote();
  }, [curveState.decimals, curveState.listed, curveState.pair, curveState.symbol, dexAmount, dexSide, wallet.ethereum, wallet.getProvider]);

  const afterWrite = async (message: string) => {
    showSuccess(message);
    await Promise.all([loadFactory(), refreshToken(), refreshProposal()]);
  };

  const createCurve = async () => {
    if (!name.trim() || !symbol.trim()) {
      showInfo("Enter a token name and symbol.");
      return;
    }
    try {
      const ok = await wallet.runWrite(async (signer) => {
        const core = new ethers.Contract(REFLOW.core, CORE_ABI, signer);
        const factory = new ethers.Contract(REFLOW.bondingCurveFactory, FACTORY_ABI, wallet.getProvider());
        const deployFee = (await factory.getDelpyFee()) as bigint;
        const amountIn = seedBuy && Number(seedBuy) > 0 ? ethers.parseEther(seedBuy) : ZERO;
        const feeDen = factoryConfig?.feeDenominator ?? BigInt(1);
        const feeNum = factoryConfig?.feeNumerator ?? BigInt(100);
        const fee = calcFee(amountIn, feeDen, feeNum);
        const value = amountIn + fee + deployFee;
        const tx = await core.createCurve(
          wallet.account,
          name.trim(),
          symbol.trim(),
          tokenURI.trim() || "ipfs://reflow",
          amountIn,
          fee,
          { value }
        );
        const receipt = await tx.wait();
        const parsed = receipt?.logs
          .map((log: ethers.Log) => {
            try {
              return factory.interface.parseLog({ topics: log.topics as string[], data: log.data });
            } catch {
              return null;
            }
          })
          .find((item: { name: string } | null) => item?.name === "Create");
        if (parsed) {
          const token = parsed.args.token as string;
          const curve = parsed.args.curve as string;
          const next = saveTrackedToken({ address: token, name: name.trim(), symbol: symbol.trim(), curve });
          setTracked(next);
          setSelectedToken(token);
          setTokenInput(token);
          setStep(2);
        }
      });
      if (ok) await afterWrite("Token launched on the bonding curve.");
    } catch (error) {
      showError(txError(error));
    }
  };

  const tradeCurve = async () => {
    if (!ethers.isAddress(tokenAddress)) {
      showInfo("Select or paste a token first.");
      return;
    }
    if (!tradeAmount || Number(tradeAmount) <= 0) {
      showInfo("Enter a valid amount.");
      return;
    }
    try {
      const ok = await wallet.runWrite(async (signer) => {
        const core = new ethers.Contract(REFLOW.core, CORE_ABI, signer);
        if (tradeSide === "buy") {
          const amountIn = ethers.parseEther(tradeAmount);
          const fee = calcFee(amountIn, curveState.feeDen, curveState.feeNum);
          const tx = await core.buy(amountIn, fee, tokenAddress, wallet.account, deadline(), {
            value: amountIn + fee,
          });
          await tx.wait();
        } else {
          const amountIn = ethers.parseUnits(tradeAmount, curveState.decimals);
          const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
          const allowance = (await token.allowance(wallet.account, REFLOW.core)) as bigint;
          if (allowance < amountIn) {
            const approveTx = await token.approve(REFLOW.core, amountIn);
            await approveTx.wait();
          }
          const tx = await core.sell(amountIn, tokenAddress, wallet.account, deadline());
          await tx.wait();
        }
        setTradeAmount("");
      });
      if (ok) await afterWrite(tradeSide === "buy" ? "Bought on the bonding curve." : "Sold on the bonding curve.");
    } catch (error) {
      showError(txError(error));
    }
  };

  const graduate = async () => {
    if (!isSetAddress(curveState.curve)) {
      showInfo("Load a locked curve first.");
      return;
    }
    try {
      const ok = await wallet.runWrite(async (signer) => {
        const curve = new ethers.Contract(curveState.curve, CURVE_ABI, signer);
        const tx = await curve.listing();
        await tx.wait();
      });
      if (ok) {
        await afterWrite("Listed on Uniswap V2. LP locked in the recycling vault.");
        setStep(4);
      }
    } catch (error) {
      showError(txError(error));
    }
  };

  const tradeDex = async () => {
    if (!isSetAddress(REFLOW.dexRouter)) {
      showError("DexRouter address is not configured.");
      return;
    }
    if (!ethers.isAddress(tokenAddress) || !dexAmount || Number(dexAmount) <= 0) {
      showInfo("Enter a listed token and amount.");
      return;
    }
    try {
      const ok = await wallet.runWrite(async (signer) => {
        const router = new ethers.Contract(REFLOW.dexRouter, DEX_ROUTER_ABI, signer);
        if (dexSide === "buy") {
          const amountIn = ethers.parseEther(dexAmount);
          const [den, num] = (await router.getFeeConfig()) as [bigint, bigint];
          const fee = calcFee(amountIn, den, num);
          const tx = await router.buy(amountIn, fee, tokenAddress, wallet.account, deadline(), {
            value: amountIn + fee,
          });
          await tx.wait();
        } else {
          const amountIn = ethers.parseUnits(dexAmount, curveState.decimals);
          const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
          const allowance = (await token.allowance(wallet.account, REFLOW.dexRouter)) as bigint;
          if (allowance < amountIn) {
            const approveTx = await token.approve(REFLOW.dexRouter, amountIn);
            await approveTx.wait();
          }
          const tx = await router.sell(amountIn, tokenAddress, wallet.account, deadline());
          await tx.wait();
        }
        setDexAmount("");
      });
      if (ok) await afterWrite("DEX trade recorded by ActivityMonitor.");
    } catch (error) {
      showError(txError(error));
    }
  };

  const markInactive = async () => {
    const token = deadToken || tokenAddress;
    if (!ethers.isAddress(token)) {
      showInfo("Paste the inactive token address.");
      return;
    }
    try {
      const ok = await wallet.runWrite(async (signer) => {
        const vault = new ethers.Contract(REFLOW.lpVault, VAULT_ABI, signer);
        const tx = await vault.markInactive(token);
        await tx.wait();
      });
      if (ok) await afterWrite("LP marked inactive.");
    } catch (error) {
      showError(txError(error));
    }
  };

  const proposeRecycle = async () => {
    const dead = deadToken || tokenAddress;
    if (!ethers.isAddress(dead) || !ethers.isAddress(candidateToken)) {
      showInfo("Enter a dead token and an active candidate.");
      return;
    }
    try {
      let createdId = "";
      const ok = await wallet.runWrite(async (signer) => {
        const governor = new ethers.Contract(REFLOW.governor, GOVERNOR_ABI, signer);
        const tx = await governor.propose(dead, [candidateToken]);
        const receipt = await tx.wait();
        const parsed = receipt?.logs
          .map((log: ethers.Log) => {
            try {
              return governor.interface.parseLog({ topics: log.topics as string[], data: log.data });
            } catch {
              return null;
            }
          })
          .find((item: { name: string } | null) => item?.name === "ProposalCreated");
        createdId = parsed ? String(parsed.args.id ?? parsed.args[0]) : "";
      });
      if (!ok) return;
      if (createdId) setProposalId(createdId);
      await afterWrite("Recycling proposal created.");
    } catch (error) {
      showError(txError(error));
    }
  };

  const vote = async () => {
    if (!proposalId || !ethers.isAddress(voteCandidate)) {
      showInfo("Enter a proposal id and candidate token.");
      return;
    }
    try {
      const ok = await wallet.runWrite(async (signer) => {
        const governor = new ethers.Contract(REFLOW.governor, GOVERNOR_ABI, signer);
        const value = ethers.parseEther(voteStake || "0.01");
        const tx = await governor.vote(BigInt(proposalId), voteCandidate, { value });
        await tx.wait();
      });
      if (ok) await afterWrite("Vote counted.");
    } catch (error) {
      showError(txError(error));
    }
  };

  const executeProposal = async () => {
    if (!proposalId) {
      showInfo("Enter a proposal id.");
      return;
    }
    try {
      const ok = await wallet.runWrite(async (signer) => {
        const governor = new ethers.Contract(REFLOW.governor, GOVERNOR_ABI, signer);
        const tx = await governor.execute(BigInt(proposalId));
        await tx.wait();
      });
      if (ok) await afterWrite("Liquidity recycled.");
    } catch (error) {
      showError(txError(error));
    }
  };

  const selectToken = (address: string) => {
    setSelectedToken(address);
    setTokenInput(address);
    setDeadToken(address);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="rounded-2xl border border-card-border bg-card/80 p-6 shadow-2xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Liquidity-recycling launchpad</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Reflow</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Launch on a bonding curve, graduate to Uniswap V2 with locked LP, then recycle dead liquidity into active
              projects.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {wallet.isConnected ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                {shortAddress(wallet.account)} · {formatToken(nativeBalance)} MON
              </div>
            ) : (
              <button
                onClick={wallet.connectWallet}
                className="inline-flex items-center gap-2 rounded-lg bg-monad-purple px-4 py-2 text-sm font-semibold text-white hover:bg-monad-purple/80"
              >
                <Wallet className="h-4 w-4" /> Connect Wallet
              </button>
            )}
            {!wallet.isCorrectNetwork && (
              <button
                onClick={wallet.switchToMonad}
                className="inline-flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-500/20"
              >
                <AlertTriangle className="h-4 w-4" /> Switch to Monad Testnet
              </button>
            )}
            <button
              onClick={() => {
                loadFactory();
                refreshToken();
                refreshProposal();
              }}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {!contractsReady && (
        <section className="mt-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-100">
          Core and BondingCurveFactory addresses are missing. Deploy the Reflow stack, then copy
          `implementation/deployments/monadTestnet.json` into `frontend/app/config/addresses.json` or set
          `NEXT_PUBLIC_CORE` / `NEXT_PUBLIC_BONDING_CURVE_FACTORY`.
        </section>
      )}

      <ol className="mt-6 grid gap-3 md:grid-cols-5">
        {STEPS.map((item) => {
          const active = step === item.id;
          return (
            <li key={item.id}>
              <button
                onClick={() => setStep(item.id)}
                className={`w-full rounded-xl border px-3 py-4 text-left transition ${
                  active
                    ? "border-monad-purple bg-monad-purple/15 text-white"
                    : "border-card-border bg-card/80 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.2em]">Step {item.id}</p>
                <p className="mt-1 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-[11px]">{item.hint}</p>
              </button>
            </li>
          );
        })}
      </ol>

      <section className="mt-6 rounded-2xl border border-card-border bg-card/80 p-5">
        <h2 className="text-lg font-semibold text-white">Token</h2>
        <p className="mt-1 text-xs text-zinc-400">Paste an address or pick one you launched in this browser.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={tokenInput}
            onChange={(e) => {
              setTokenInput(e.target.value.trim());
              setSelectedToken("");
            }}
            placeholder="0x token address"
            className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-monad-purple"
          />
          <button
            onClick={refreshToken}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Load
          </button>
        </div>
        {tracked.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tracked.map((t) => (
              <button
                key={t.address}
                onClick={() => selectToken(t.address)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  tokenAddress.toLowerCase() === t.address.toLowerCase()
                    ? "border-monad-purple text-white"
                    : "border-zinc-700 text-zinc-400 hover:text-white"
                }`}
              >
                {t.symbol} · {shortAddress(t.address)}
              </button>
            ))}
          </div>
        )}
        {isSetAddress(curveState.curve) && (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <DataRow label="Name" value={`${curveState.name} (${curveState.symbol})`} />
            <DataRow label="Curve" value={shortAddress(curveState.curve)} mono />
            <DataRow
              label="Status"
              value={curveState.listed ? "Listed" : curveState.locked ? "Locked — ready to graduate" : "Trading"}
            />
            <DataRow
              label="Your tokens"
              value={`${formatToken(curveState.walletBalance, curveState.decimals)} ${curveState.symbol}`}
            />
          </dl>
        )}
        {isSetAddress(tokenAddress) && (
          <a
            href={`${wallet.explorerBase}/address/${tokenAddress}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs text-monad-purple hover:text-white"
          >
            Token on explorer <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </section>

      {step === 1 && (
        <section className="mt-6 rounded-2xl border border-card-border bg-card/80 p-5">
          <h2 className="text-lg font-semibold text-white">1. Launch a token</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Calls `Core.createCurve`. Pay deploy fee plus an optional seed buy (fee is 1% of the seed).
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Name" value={name} onChange={setName} placeholder="Reflow Frog" />
            <Field label="Symbol" value={symbol} onChange={setSymbol} placeholder="FROG" />
            <Field label="Token URI" value={tokenURI} onChange={setTokenURI} placeholder="ipfs://..." />
            <Field label="Seed buy (MON, optional)" value={seedBuy} onChange={setSeedBuy} />
          </div>
          {factoryConfig && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <StatCard label="Deploy fee" value={`${formatToken(factoryConfig.deployFee)} MON`} />
              <StatCard label="Listing fee" value={`${formatToken(factoryConfig.listingFee)} MON`} />
              <StatCard label="Target remaining tokens" value={formatToken(factoryConfig.targetToken)} />
            </div>
          )}
          <div className="mt-5 max-w-xs">
            <PrimaryButton onClick={createCurve} loading={wallet.isSubmitting} disabled={!contractsReady}>
              Create curve
            </PrimaryButton>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="mt-6 rounded-2xl border border-card-border bg-card/80 p-5">
          <h2 className="text-lg font-semibold text-white">2. Trade the bonding curve</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Buy until remaining tokens hit the target. The curve then locks and is ready to graduate.
          </p>
          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full bg-monad-purple" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="mt-2 text-xs text-zinc-400">{progressPct.toFixed(1)}% of listing target</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <StatCard label="Virtual MON" value={formatToken(curveState.virtualNative)} />
            <StatCard label="Virtual tokens" value={formatToken(curveState.virtualToken, curveState.decimals)} />
            <StatCard label="Real MON in curve" value={formatToken(curveState.reserveNative)} />
            <StatCard label="Your balance" value={`${formatToken(curveState.walletBalance, curveState.decimals)} ${curveState.symbol}`} />
          </div>
          <div className="mt-5 flex gap-2">
            {(["buy", "sell"] as const).map((side) => (
              <button
                key={side}
                onClick={() => setTradeSide(side)}
                className={`rounded-lg px-4 py-2 text-sm ${
                  tradeSide === side ? "bg-monad-purple text-white" : "border border-zinc-700 text-zinc-400"
                }`}
              >
                {side === "buy" ? "Buy with MON" : "Sell tokens"}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label={tradeSide === "buy" ? "MON in" : `${curveState.symbol || "Token"} in`}
              value={tradeAmount}
              onChange={setTradeAmount}
            />
            <div className="rounded-lg border border-zinc-800 bg-black/35 p-3 text-sm text-zinc-300">
              Estimated out
              <p className="mt-2 text-white">{quoteOut || "—"}</p>
            </div>
          </div>
          <div className="mt-5 max-w-xs">
            <PrimaryButton
              onClick={tradeCurve}
              loading={wallet.isSubmitting} disabled={curveState.locked || curveState.listed || !isSetAddress(curveState.curve)}
            >
              {curveState.locked ? "Curve locked" : tradeSide === "buy" ? "Buy" : "Approve + sell"}
            </PrimaryButton>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="mt-6 rounded-2xl border border-card-border bg-card/80 p-5">
          <h2 className="text-lg font-semibold text-white">3. Graduate to Uniswap V2</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Anyone can call `BondingCurve.listing()` after lock. LP is minted and sent to `LPRecyclingVault` instead of
            being burned.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <StatCard label="Locked" value={curveState.locked ? "Yes" : "No"} />
            <StatCard label="Listed" value={curveState.listed ? "Yes" : "No"} />
            <StatCard label="Pair" value={isSetAddress(curveState.pair) ? shortAddress(curveState.pair) : "-"} />
          </div>
          {position && isSetAddress(position.token) && (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <DataRow label="Vault status" value={POSITION_STATUS[position.status] ?? String(position.status)} />
              <DataRow label="Locked LP" value={formatToken(position.liquidity)} />
              <DataRow label="Locked at" value={formatDateTime(position.lockedAt)} />
              <DataRow label="Creator" value={shortAddress(position.creator)} mono />
            </dl>
          )}
          <div className="mt-5 max-w-xs">
            <PrimaryButton
              onClick={graduate}
              loading={wallet.isSubmitting} disabled={!curveState.locked || curveState.listed}
            >
              {curveState.listed ? "Already listed" : "Call listing()"}
            </PrimaryButton>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="mt-6 rounded-2xl border border-card-border bg-card/80 p-5">
          <h2 className="text-lg font-semibold text-white">4. Trade on DexRouter</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Post-listing swaps go through `DexRouter` so `ActivityMonitor` records volume and tx count.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <StatCard
              label="Window volume"
              value={activity ? `${formatToken(activity.volumeNativeInWindow)} MON` : "-"}
            />
            <StatCard label="Window txs" value={activity ? activity.txCountInWindow.toString() : "-"} />
            <StatCard
              label="Last swap"
              value={activity ? formatDateTime(activity.lastSwapAt) : "-"}
            />
          </div>
          <div className="mt-5 flex gap-2">
            {(["buy", "sell"] as const).map((side) => (
              <button
                key={side}
                onClick={() => setDexSide(side)}
                className={`rounded-lg px-4 py-2 text-sm ${
                  dexSide === side ? "bg-monad-purple text-white" : "border border-zinc-700 text-zinc-400"
                }`}
              >
                {side === "buy" ? "Buy with MON" : "Sell tokens"}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label={dexSide === "buy" ? "MON in" : `${curveState.symbol || "Token"} in`}
              value={dexAmount}
              onChange={setDexAmount}
            />
            <div className="rounded-lg border border-zinc-800 bg-black/35 p-3 text-sm text-zinc-300">
              Estimated out
              <p className="mt-2 text-white">{dexQuote || "—"}</p>
            </div>
          </div>
          <div className="mt-5 max-w-xs">
            <PrimaryButton
              onClick={tradeDex}
              loading={wallet.isSubmitting} disabled={!curveState.listed || !isSetAddress(REFLOW.dexRouter)}
            >
              {curveState.listed ? (dexSide === "buy" ? "DEX buy" : "Approve + DEX sell") : "List first"}
            </PrimaryButton>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="mt-6 space-y-6">
          <div className="rounded-2xl border border-card-border bg-card/80 p-5">
            <h2 className="text-lg font-semibold text-white">5. Recycle dead LP</h2>
            <p className="mt-1 text-xs text-zinc-400">
              After the inactivity window, mark the pool inactive, propose active candidates, vote with MON, then
              execute. The winner receives recycled WNATIVE as new locked LP.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <StatCard label="Eligible" value={activity?.recyclingEligible ? "Yes" : "No"} />
              <StatCard label="Inactive" value={activity?.inactive ? "Yes" : "No"} />
              <StatCard
                label="Vault status"
                value={position ? POSITION_STATUS[position.status] ?? "-" : "-"}
              />
              <StatCard label="Min vote stake" value={`${formatToken(minVoteStake)} MON`} />
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Dead token" value={deadToken} onChange={setDeadToken} placeholder="0x..." />
              <Field label="Active candidate" value={candidateToken} onChange={setCandidateToken} placeholder="0x..." />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="w-full max-w-xs">
                <PrimaryButton onClick={markInactive} loading={wallet.isSubmitting} disabled={!isSetAddress(REFLOW.lpVault)}>
                  Mark inactive
                </PrimaryButton>
              </div>
              <div className="w-full max-w-xs">
                <PrimaryButton
                  onClick={proposeRecycle}
                  loading={wallet.isSubmitting} disabled={!isSetAddress(REFLOW.governor)}
                >
                  Propose recycle
                </PrimaryButton>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-card-border bg-card/80 p-5">
            <h3 className="text-base font-semibold text-white">Vote and execute</h3>
            <p className="mt-1 text-xs text-zinc-400">
              {proposalCount > ZERO ? `${proposalCount.toString()} proposal(s) on-chain.` : "No proposals yet."}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Proposal ID" value={proposalId} onChange={setProposalId} placeholder="1" />
              <Field label="Candidate to vote" value={voteCandidate} onChange={setVoteCandidate} placeholder="0x..." />
              <Field label="Vote weight (MON)" value={voteStake} onChange={setVoteStake} />
            </div>
            {proposal && (
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <DataRow label="State" value={PROPOSAL_STATE[proposal.state] ?? String(proposal.state)} />
                <DataRow label="Dead token" value={shortAddress(proposal.deadToken)} mono />
                <DataRow label="Ends" value={formatDateTime(proposal.endTime)} />
                <DataRow
                  label="Time left"
                  value={formatDuration(Number(proposal.endTime) - Math.floor(Date.now() / 1000))}
                />
                {proposal.candidates.map((c) => (
                  <DataRow
                    key={c}
                    label={`Votes ${shortAddress(c)}`}
                    value={`${formatToken(candidateVotes[c] ?? ZERO)} MON`}
                  />
                ))}
              </dl>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="w-full max-w-xs">
                <PrimaryButton onClick={vote} loading={wallet.isSubmitting}>
                  Vote
                </PrimaryButton>
              </div>
              <div className="w-full max-w-xs">
                <PrimaryButton onClick={executeProposal} loading={wallet.isSubmitting}>
                  Execute recycle
                </PrimaryButton>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-card-border bg-card/80 p-5">
        <h2 className="text-lg font-semibold text-white">Contracts</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {[
            ["Core", REFLOW.core],
            ["BondingCurveFactory", REFLOW.bondingCurveFactory],
            ["DexRouter", REFLOW.dexRouter],
            ["LPRecyclingVault", REFLOW.lpVault],
            ["ActivityMonitor", REFLOW.activityMonitor],
            ["Governor", REFLOW.governor],
            ["WNative", REFLOW.wNative],
            ["FeeVault", REFLOW.feeVault],
          ].map(([label, address]) => (
            <DataRow key={label} label={label} value={isSetAddress(address) ? shortAddress(address) : "not set"} mono />
          ))}
        </dl>
        <p className="mt-4 text-xs text-zinc-500">Network: {monadTestnet.name} · chain {monadTestnet.id}</p>
      </section>
    </div>
  );
}
