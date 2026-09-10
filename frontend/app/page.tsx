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
import { useWalletContext } from "@/app/contexts/WalletContext";
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
import { explorerAddress, getFreshPublicProvider, getPublicProvider } from "@/app/lib/provider";
import { loadProtocol, mergeTokens, resolvePair, type ProposalView } from "@/app/lib/protocol";
import { decodeCallError, sendContractTx } from "@/app/lib/tx";
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
  const wallet = useWalletContext();

  const [step, setStep] = useState<StepId>(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [factoryConfig, setFactoryConfig] = useState<FactoryConfig | null>(null);
  const [tracked, setTracked] = useState<TrackedToken[]>([]);
  const [tokenInput, setTokenInput] = useState("");
  const [selectedToken, setSelectedToken] = useState("");
  const [curveState, setCurveState] = useState<CurveState>(EMPTY_CURVE);
  const [position, setVaultPosition] = useState<VaultPosition | null>(null);
  const [activity, setActivity] = useState<PoolActivity | null>(null);

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
  const [proposals, setProposals] = useState<ProposalView[]>([]);
  const [listedTokens, setVaultListed] = useState<TrackedToken[]>([]);
  const [wired, setWired] = useState(false);
  const [votingPeriod, setVotingPeriod] = useState(ZERO);
  const [inactivityPeriod, setInactivityPeriod] = useState(ZERO);

  const contractsReady = isSetAddress(REFLOW.core) && isSetAddress(REFLOW.bondingCurveFactory);
  const tokenAddress = selectedToken || tokenInput;

  const progressPct = useMemo(() => {
    if (curveState.targetToken === ZERO) return curveState.locked || curveState.listed ? 100 : 0;
    const supply = factoryConfig?.tokenTotalSupply && factoryConfig.tokenTotalSupply > ZERO
      ? factoryConfig.tokenTotalSupply
      : BigInt("1000000000000000000000000000"); // 1e27 matches Token.mint
    const sold = supply > curveState.reserveToken ? supply - curveState.reserveToken : ZERO;
    const targetSold = supply > curveState.targetToken ? supply - curveState.targetToken : ZERO;
    if (targetSold === ZERO) return curveState.locked || curveState.listed ? 100 : 0;
    const pct = Number((sold * BigInt(10000)) / targetSold) / 100;
    return Math.max(0, Math.min(100, pct));
  }, [factoryConfig, curveState]);

  const tokensToLock =
    !curveState.locked &&
    !curveState.listed &&
    curveState.targetToken > ZERO &&
    curveState.reserveToken > curveState.targetToken
      ? curveState.reserveToken - curveState.targetToken
      : ZERO;

  const canFinalizeLock = tokensToLock > ZERO && isSetAddress(curveState.curve);

  const loadFactory = useCallback(async () => {
    if (!contractsReady) return;
    const provider = getFreshPublicProvider();
    const snap = await loadProtocol(provider);
    setFactoryConfig(snap.config);
    setMinVoteStake(snap.minVoteStake);
    setProposalCount(snap.proposalCount);
    setVotingPeriod(snap.votingPeriod);
    setInactivityPeriod(snap.inactivityPeriod);
    setWired(snap.wired);
    setProposals(snap.proposals);
    setVaultListed(snap.vaultTokens);
    setTracked(mergeTokens(loadTrackedTokens(), snap.launchedTokens, snap.vaultTokens));
    snap.launchedTokens.forEach(saveTrackedToken);
  }, [contractsReady]);

  const refreshToken = useCallback(async (overrideAddress?: string) => {
    if (!contractsReady) return;
    const address = isSetAddress(overrideAddress || tokenAddress) ? (overrideAddress || tokenAddress) : "";
    if (!address) {
      setCurveState(EMPTY_CURVE);
      setVaultPosition(null);
      setActivity(null);
      return;
    }

    setIsRefreshing(true);
    try {
      const provider = getFreshPublicProvider();
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
      const [locked, listed, k, virtuals, reserves, target, feeCfg, pairRaw, nameOnchain, symbolOnchain, decimals, bal] =
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

      const pair = await resolvePair(provider, address, pairRaw);

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
      setTracked(mergeTokens(loadTrackedTokens(), listedTokens));
    } catch (error) {
      showError(txError(error));
    } finally {
      setIsRefreshing(false);
    }
  }, [contractsReady, listedTokens, showError, tokenAddress, wallet.account]);

  const refreshProposal = useCallback(async () => {
    if (!isSetAddress(REFLOW.governor) || !proposalId) {
      setProposal(null);
      return;
    }
    try {
      const provider = getPublicProvider();
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
  }, [proposalId, showError]);

  useEffect(() => {
    setTracked(loadTrackedTokens());
    loadFactory().catch((error) => showError(txError(error)));
  }, [loadFactory, showError]);

  useEffect(() => {
    if (!isSetAddress(tokenAddress)) return;
    refreshToken();
  }, [refreshToken, tokenAddress, wallet.account]);

  // Keep curve stats fresh while trading (public RPC can lag wallet receipts).
  useEffect(() => {
    if (!isSetAddress(tokenAddress)) return;
    const timer = setInterval(() => {
      refreshToken(tokenAddress);
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshToken, tokenAddress]);

  useEffect(() => {
    refreshProposal();
  }, [refreshProposal]);

  useEffect(() => {
    const updateQuote = async () => {
      setQuoteOut("");
      if (!contractsReady || !isSetAddress(tokenAddress) || !tradeAmount) return;
      try {
        const amount = ethers.parseEther(tradeAmount);
        if (amount <= ZERO) return;
        const provider = getPublicProvider();
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
  }, [contractsReady, curveState, tokenAddress, tradeAmount, tradeSide]);

  useEffect(() => {
    const updateDexQuote = async () => {
      setDexQuote("");
      if (!curveState.listed || !dexAmount || !isSetAddress(curveState.pair)) return;
      try {
        const provider = getPublicProvider();
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
  }, [curveState.decimals, curveState.listed, curveState.pair, curveState.symbol, dexAmount, dexSide]);

  const afterWrite = async (message: string, tokenOverride?: string) => {
    showSuccess(message);
    const target = tokenOverride || tokenAddress;
    await Promise.all([loadFactory(), refreshToken(target), refreshProposal(), wallet.refreshBalance()]);
    if (isSetAddress(target)) {
      await new Promise((r) => setTimeout(r, 900));
      await refreshToken(target);
      await wallet.refreshBalance();
    }
  };

  const createCurve = async () => {
    if (!name.trim() || !symbol.trim()) {
      showInfo("Enter a token name and symbol.");
      return;
    }
    try {
      let launchedToken = "";
      const ok = await wallet.runWrite(async (signer) => {
        const factory = new ethers.Contract(REFLOW.bondingCurveFactory, FACTORY_ABI, getFreshPublicProvider());
        const deployFee = (await factory.getDelpyFee()) as bigint;
        const amountIn = seedBuy && Number(seedBuy) > 0 ? ethers.parseEther(seedBuy) : ZERO;
        const feeDen = factoryConfig?.feeDenominator ?? BigInt(1);
        const feeNum = factoryConfig?.feeNumerator ?? BigInt(100);
        const fee = calcFee(amountIn, feeDen, feeNum);
        const value = amountIn + fee + deployFee;
        const receipt = await sendContractTx(
          signer,
          REFLOW.core,
          CORE_ABI,
          "createCurve",
          [wallet.account, name.trim(), symbol.trim(), tokenURI.trim() || "ipfs://reflow", amountIn, fee],
          { value }
        );
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
          launchedToken = token;
          const next = saveTrackedToken({ address: token, name: name.trim(), symbol: symbol.trim(), curve });
          setTracked(next);
          setSelectedToken(token);
          setTokenInput(token);
          setStep(2);
        }
      });
      if (ok) await afterWrite("Token launched on the bonding curve.", launchedToken);
    } catch (error) {
      showError(decodeCallError(error, "createCurve"));
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
        if (tradeSide === "buy") {
          const amountIn = ethers.parseEther(tradeAmount);
          // Prefer live fee config from curve; fall back to factory 1%.
          let feeDen = curveState.feeDen;
          let feeNum = curveState.feeNum;
          if (feeNum === ZERO) {
            feeDen = BigInt(1);
            feeNum = BigInt(100);
          }
          let fee = calcFee(amountIn, feeDen, feeNum);
          if (fee === ZERO) fee = 1n; // Core.buy requires fee > 0
          await sendContractTx(
            signer,
            REFLOW.core,
            CORE_ABI,
            "buy",
            [amountIn, fee, tokenAddress, wallet.account, deadline()],
            { value: amountIn + fee }
          );
        } else {
          const amountIn = ethers.parseUnits(tradeAmount, curveState.decimals);
          const token = new ethers.Contract(tokenAddress, ERC20_ABI, getPublicProvider());
          const allowance = (await token.allowance(wallet.account, REFLOW.core)) as bigint;
          if (allowance < amountIn) {
            await sendContractTx(signer, tokenAddress, ERC20_ABI, "approve", [REFLOW.core, amountIn]);
          }
          await sendContractTx(signer, REFLOW.core, CORE_ABI, "sell", [
            amountIn,
            tokenAddress,
            wallet.account,
            deadline(),
          ]);
        }
        setTradeAmount("");
      });
      if (ok) {
        await afterWrite(
          tradeSide === "buy" ? "Bought on the bonding curve." : "Sold on the bonding curve.",
          tokenAddress
        );
      }
    } catch (error) {
      showError(decodeCallError(error, "buy/sell"));
    }
  };

  const finalizeLock = async () => {
    if (!ethers.isAddress(tokenAddress) || !isSetAddress(curveState.curve)) {
      showInfo("Load a curve first.");
      return;
    }
    try {
      const ok = await wallet.runWrite(async (signer) => {
        const provider = getFreshPublicProvider();
        const core = new ethers.Contract(REFLOW.core, CORE_ABI, provider);
        const curve = new ethers.Contract(curveState.curve, CURVE_ABI, provider);
        const [, , , k] = (await core.getCurveData(REFLOW.bondingCurveFactory, tokenAddress)) as [
          string,
          bigint,
          bigint,
          bigint,
        ];
        const [virtualNative, virtualToken] = (await curve.getVirtualReserves()) as [bigint, bigint];
        const [, reserveToken] = (await curve.getReserves()) as [bigint, bigint];
        const targetToken = (await curve.getTargetToken()) as bigint;
        if (reserveToken <= targetToken) {
          throw new Error("Nothing left to buy — refresh and check Locked status.");
        }
        const amountOut = reserveToken - targetToken;
        const amountIn = (await core.getAmountIn(amountOut, k, virtualNative, virtualToken)) as bigint;
        const feeCfg = (await curve.getFeeConfig()) as [number, number];
        let feeDen = BigInt(feeCfg[0]);
        let feeNum = BigInt(feeCfg[1]);
        if (feeNum === ZERO) {
          feeDen = BigInt(1);
          feeNum = BigInt(100);
        }
        const fee = calcFee(amountIn, feeDen, feeNum);
        // Buffer covers fee rounding + refund of unused native
        const amountInMax = amountIn + fee + ethers.parseEther("0.02");
        await sendContractTx(
          signer,
          REFLOW.core,
          CORE_ABI,
          "exactOutBuy",
          [amountInMax, amountOut, tokenAddress, wallet.account, deadline()],
          { value: amountInMax }
        );
      });
      if (ok) {
        await afterWrite("Curve locked at target. You can graduate now.", tokenAddress);
        setStep(3);
      }
    } catch (error) {
      showError(decodeCallError(error, "exactOutBuy"));
    }
  };

  const graduate = async () => {
    if (!isSetAddress(curveState.curve)) {
      showInfo("Load a locked curve first.");
      return;
    }
    try {
      const ok = await wallet.runWrite(async (signer) => {
        await sendContractTx(signer, curveState.curve, CURVE_ABI, "listing", []);
      });
      if (ok) {
        await afterWrite("Listed on Uniswap V2. LP locked in the recycling vault.");
        setStep(4);
      }
    } catch (error) {
      showError(decodeCallError(error, "listing"));
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
        if (dexSide === "buy") {
          const amountIn = ethers.parseEther(dexAmount);
          const router = new ethers.Contract(REFLOW.dexRouter, DEX_ROUTER_ABI, getPublicProvider());
          const [den, num] = (await router.getFeeConfig()) as [bigint, bigint];
          const fee = calcFee(amountIn, den, num);
          await sendContractTx(
            signer,
            REFLOW.dexRouter,
            DEX_ROUTER_ABI,
            "buy",
            [amountIn, fee, tokenAddress, wallet.account, deadline()],
            { value: amountIn + fee }
          );
        } else {
          const amountIn = ethers.parseUnits(dexAmount, curveState.decimals);
          const token = new ethers.Contract(tokenAddress, ERC20_ABI, getPublicProvider());
          const allowance = (await token.allowance(wallet.account, REFLOW.dexRouter)) as bigint;
          if (allowance < amountIn) {
            await sendContractTx(signer, tokenAddress, ERC20_ABI, "approve", [REFLOW.dexRouter, amountIn]);
          }
          await sendContractTx(signer, REFLOW.dexRouter, DEX_ROUTER_ABI, "sell", [
            amountIn,
            tokenAddress,
            wallet.account,
            deadline(),
          ]);
        }
        setDexAmount("");
      });
      if (ok) await afterWrite("DEX trade recorded by ActivityMonitor.");
    } catch (error) {
      showError(decodeCallError(error, "dex trade"));
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
        await sendContractTx(signer, REFLOW.lpVault, VAULT_ABI, "markInactive", [token]);
      });
      if (ok) await afterWrite("LP marked inactive.");
    } catch (error) {
      showError(decodeCallError(error, "markInactive"));
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
        const receipt = await sendContractTx(signer, REFLOW.governor, GOVERNOR_ABI, "propose", [
          dead,
          [candidateToken],
        ]);
        const governor = new ethers.Contract(REFLOW.governor, GOVERNOR_ABI, getPublicProvider());
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
      showError(decodeCallError(error, "propose"));
    }
  };

  const vote = async () => {
    if (!proposalId || !ethers.isAddress(voteCandidate)) {
      showInfo("Enter a proposal id and candidate token.");
      return;
    }
    try {
      const ok = await wallet.runWrite(async (signer) => {
        const value = ethers.parseEther(voteStake || "0.01");
        await sendContractTx(signer, REFLOW.governor, GOVERNOR_ABI, "vote", [BigInt(proposalId), voteCandidate], {
          value,
        });
      });
      if (ok) await afterWrite("Vote counted.");
    } catch (error) {
      showError(decodeCallError(error, "vote"));
    }
  };

  const executeProposal = async () => {
    if (!proposalId) {
      showInfo("Enter a proposal id.");
      return;
    }
    try {
      const ok = await wallet.runWrite(async (signer) => {
        await sendContractTx(signer, REFLOW.governor, GOVERNOR_ABI, "execute", [BigInt(proposalId)]);
      });
      if (ok) await afterWrite("Liquidity recycled.");
    } catch (error) {
      showError(decodeCallError(error, "execute"));
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
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-400">Connected wallet</p>
                <p className="mt-1 font-mono text-sm text-white">{shortAddress(wallet.account)}</p>
                <p className="mt-1 text-lg font-semibold text-white">{formatToken(wallet.nativeBalance, 18, 6)} MON</p>
              </div>
            ) : (
              <button
                onClick={wallet.connectWallet}
                className="inline-flex items-center gap-2 rounded-lg bg-monad-purple px-4 py-2 text-sm font-semibold text-white hover:bg-monad-purple/80"
              >
                <Wallet className="h-4 w-4" /> Connect Wallet
              </button>
            )}
            {!wallet.isCorrectNetwork && wallet.isConnected && (
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

      {contractsReady && (
        <section className="mt-6 rounded-2xl border border-card-border bg-card/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Monad Testnet</p>
              <p className="mt-1 text-sm text-white">
                {wired ? "Factory, vault, and DEX are wired to this deployment." : "Reading live contract state…"}
              </p>
            </div>
            <a
              href={explorerAddress(REFLOW.core)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-monad-purple hover:text-white"
            >
              Core {shortAddress(REFLOW.core)} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>
      )}

      {!contractsReady && (
        <section className="mt-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-100">
          Core and BondingCurveFactory addresses are missing.
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
        <p className="mt-1 text-xs text-zinc-400">
          Paste a token address, or pick one discovered on-chain / launched in this browser.
        </p>
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
            <DataRow
              label="Curve"
              value={shortAddress(curveState.curve)}
              mono
              href={explorerAddress(curveState.curve)}
            />
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
            Calls Core.createCurve. Seed buy is optional (fee is 1% of the seed). Creating the curve deploys two
            contracts, so keep a little extra MON for gas.
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
            <p className="mt-2 text-xs text-zinc-400">
              {progressPct.toFixed(1)}% of listing target
              {isRefreshing ? " · syncing…" : ""}
            </p>
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
          <div className="mt-5 flex max-w-xl flex-col gap-3 sm:flex-row">
            <div className="w-full max-w-xs">
              <PrimaryButton
                onClick={tradeCurve}
                loading={wallet.isSubmitting}
                disabled={curveState.locked || curveState.listed || !isSetAddress(curveState.curve)}
              >
                {curveState.locked ? "Curve locked" : tradeSide === "buy" ? "Buy" : "Approve + sell"}
              </PrimaryButton>
            </div>
            {canFinalizeLock && (
              <div className="w-full max-w-xs">
                <PrimaryButton onClick={finalizeLock} loading={wallet.isSubmitting}>
                  Lock curve (final ~{formatToken(tokensToLock, curveState.decimals, 2)} tokens)
                </PrimaryButton>
                <p className="mt-2 text-[11px] text-zinc-500">
                  Uses exactOutBuy so remaining tokens hit the target exactly (market buys can overflow).
                </p>
              </div>
            )}
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
            <StatCard
              label="Pair"
              value={isSetAddress(curveState.pair) ? shortAddress(curveState.pair) : "-"}
            />
          </div>
          {!curveState.locked && canFinalizeLock && (
            <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">
              Curve is not locked yet (dust left above target). Click{" "}
              <button onClick={finalizeLock} className="underline hover:text-white">
                Lock curve
              </button>{" "}
              first — listing stays disabled until `getLock()` is true.
            </div>
          )}
          {position && isSetAddress(position.token) && (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <DataRow label="Vault status" value={POSITION_STATUS[position.status] ?? String(position.status)} />
              <DataRow label="Locked LP" value={formatToken(position.liquidity)} />
              <DataRow label="Locked at" value={formatDateTime(position.lockedAt)} />
              <DataRow label="Creator" value={shortAddress(position.creator)} mono />
            </dl>
          )}
          <div className="mt-5 flex max-w-xl flex-col gap-3 sm:flex-row">
            {!curveState.locked && canFinalizeLock && (
              <div className="w-full max-w-xs">
                <PrimaryButton onClick={finalizeLock} loading={wallet.isSubmitting}>
                  Lock curve first
                </PrimaryButton>
              </div>
            )}
            <div className="w-full max-w-xs">
              <PrimaryButton
                onClick={graduate}
                loading={wallet.isSubmitting}
                disabled={!curveState.locked || curveState.listed}
              >
                {curveState.listed ? "Already listed" : curveState.locked ? "Call listing()" : "Waiting for lock"}
              </PrimaryButton>
            </div>
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
            <p className="mt-3 text-xs text-zinc-500">
              Inactivity window {formatDuration(inactivityPeriod)} · voting period {formatDuration(votingPeriod)}
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Dead token" value={deadToken} onChange={setDeadToken} placeholder="0x..." />
              <Field label="Active candidate" value={candidateToken} onChange={setCandidateToken} placeholder="0x..." />
            </div>
            {listedTokens.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Listed tokens in vault</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {listedTokens.map((t) => (
                    <button
                      key={t.address}
                      onClick={() => setCandidateToken(t.address)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        candidateToken.toLowerCase() === t.address.toLowerCase()
                          ? "border-monad-purple text-white"
                          : "border-zinc-700 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {t.symbol || shortAddress(t.address)}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
            {proposals.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {proposals.map((p) => (
                  <button
                    key={p.id.toString()}
                    onClick={() => {
                      setProposalId(p.id.toString());
                      setDeadToken(p.deadToken);
                      setVoteCandidate(p.candidates[0] ?? "");
                    }}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      proposalId === p.id.toString()
                        ? "border-monad-purple text-white"
                        : "border-zinc-700 text-zinc-400 hover:text-white"
                    }`}
                  >
                    #{p.id.toString()} · {PROPOSAL_STATE[p.state] ?? "?"}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Proposal ID" value={proposalId} onChange={setProposalId} placeholder="1" />
              <Field label="Candidate to vote" value={voteCandidate} onChange={setVoteCandidate} placeholder="0x..." />
              <Field label="Vote weight (MON)" value={voteStake} onChange={setVoteStake} />
            </div>
            {proposal && (
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <DataRow label="State" value={PROPOSAL_STATE[proposal.state] ?? String(proposal.state)} />
                <DataRow
                  label="Dead token"
                  value={shortAddress(proposal.deadToken)}
                  mono
                  href={explorerAddress(proposal.deadToken)}
                />
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
            ["UniswapV2Factory", REFLOW.dexFactory],
            ["LPRecyclingVault", REFLOW.lpVault],
            ["ActivityMonitor", REFLOW.activityMonitor],
            ["Governor", REFLOW.governor],
            ["WNative", REFLOW.wNative],
            ["FeeVault", REFLOW.feeVault],
          ].map(([label, address]) => (
            <DataRow
              key={label}
              label={label}
              value={isSetAddress(address) ? shortAddress(address) : "not set"}
              mono
              href={isSetAddress(address) ? explorerAddress(address) : undefined}
            />
          ))}
        </dl>
        <p className="mt-4 text-xs text-zinc-500">
          Network: {monadTestnet.name} · chain {monadTestnet.id} · loaded from deployments/monadTestnet.json
        </p>
      </section>
    </div>
  );
}
