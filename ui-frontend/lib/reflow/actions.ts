import { ethers } from "ethers";
import {
  ACTIVITY_MONITOR_ABI,
  CORE_ABI,
  CURVE_ABI,
  DEX_FACTORY_ABI,
  DEX_ROUTER_ABI,
  ERC20_ABI,
  FACTORY_ABI,
  GOVERNOR_ABI,
  PAIR_ABI,
  PROPOSAL_STATE_LABELS,
  REFLOW,
  VAULT_ABI,
  VAULT_STATUS_LABELS,
  v2AmountOut,
} from "~~/config/reflow";
import { ZERO, calcFee, deadline, formatCompactMon, formatCompactUsd, formatTokenPrice, isSetAddress, monUsdPrice } from "~~/lib/reflow/format";
import { getFreshPublicProvider, getPublicProvider } from "~~/lib/reflow/provider";
import { sendContractTx } from "~~/lib/reflow/tx";

export type LaunchedTokenResult = {
  token: string;
  curve: string;
  name: string;
  symbol: string;
};

export async function createTokenCurve(params: {
  signer: ethers.Signer;
  creator: string;
  name: string;
  symbol: string;
  tokenURI: string;
  seedBuy: string;
}): Promise<LaunchedTokenResult> {
  const factory = new ethers.Contract(REFLOW.bondingCurveFactory, FACTORY_ABI, getFreshPublicProvider());
  const deployFee = (await factory.getDelpyFee()) as bigint;
  const [, feeNumerator, feeDenominator] = await (async () => {
    try {
      const cfg = await factory.getConfig();
      return [cfg, BigInt(cfg.feeNumerator), BigInt(cfg.feeDenominator)] as const;
    } catch {
      return [null, 100n, 1n] as const;
    }
  })();

  const amountIn = params.seedBuy && Number(params.seedBuy) > 0 ? ethers.parseEther(params.seedBuy) : ZERO;
  let fee = calcFee(amountIn, feeDenominator, feeNumerator);
  if (amountIn > ZERO && fee === ZERO) fee = 1n;
  const value = amountIn + fee + deployFee;

  const receipt = await sendContractTx(
    params.signer,
    REFLOW.core,
    CORE_ABI,
    "createCurve",
    [params.creator, params.name, params.symbol, params.tokenURI || "ipfs://reflow", amountIn, fee],
    { value },
  );

  const parsed = receipt?.logs
    ?.map((log: ethers.Log) => {
      try {
        return factory.interface.parseLog({ topics: log.topics as string[], data: log.data });
      } catch {
        return null;
      }
    })
    .find((item: { name: string } | null) => item?.name === "Create");

  if (!parsed) {
    throw new Error("Token created but Create event was not found in the receipt.");
  }

  return {
    token: parsed.args.token as string,
    curve: parsed.args.curve as string,
    name: params.name,
    symbol: params.symbol,
  };
}

export async function buyToken(params: {
  signer: ethers.Signer;
  account: string;
  tokenAddress: string;
  amount: string;
  isGraduated: boolean;
}) {
  const amountIn = ethers.parseEther(params.amount);
  if (params.isGraduated) {
    const router = new ethers.Contract(REFLOW.dexRouter, DEX_ROUTER_ABI, getPublicProvider());
    let den = 1n;
    let num = 100n;
    try {
      const feeCfg = await router.getFeeConfig();
      den = BigInt(feeCfg.denominator ?? feeCfg[0]);
      num = BigInt(feeCfg.numerator ?? feeCfg[1]);
    } catch {
      /* use defaults */
    }
    let fee = calcFee(amountIn, den, num);
    if (fee === ZERO) fee = 1n;
    await sendContractTx(
      params.signer,
      REFLOW.dexRouter,
      DEX_ROUTER_ABI,
      "buy",
      [amountIn, fee, params.tokenAddress, params.account, deadline()],
      { value: amountIn + fee },
    );
    return;
  }

  const factory = new ethers.Contract(REFLOW.bondingCurveFactory, FACTORY_ABI, getPublicProvider());
  let feeDen = 1n;
  let feeNum = 100n;
  try {
    const cfg = await factory.getConfig();
    feeDen = BigInt(cfg.feeDenominator);
    feeNum = BigInt(cfg.feeNumerator);
  } catch {
    /* defaults */
  }
  let fee = calcFee(amountIn, feeDen, feeNum);
  if (fee === ZERO) fee = 1n;
  await sendContractTx(
    params.signer,
    REFLOW.core,
    CORE_ABI,
    "buy",
    [amountIn, fee, params.tokenAddress, params.account, deadline()],
    { value: amountIn + fee },
  );
}

export async function sellToken(params: {
  signer: ethers.Signer;
  account: string;
  tokenAddress: string;
  amount: string;
  isGraduated: boolean;
}) {
  const amountIn = ethers.parseUnits(params.amount, 18);
  const spender = params.isGraduated ? REFLOW.dexRouter : REFLOW.core;
  const token = new ethers.Contract(params.tokenAddress, ERC20_ABI, getPublicProvider());
  const allowance = (await token.allowance(params.account, spender)) as bigint;
  if (allowance < amountIn) {
    await sendContractTx(params.signer, params.tokenAddress, ERC20_ABI, "approve", [
      spender,
      ethers.MaxUint256,
    ]);
  }

  if (params.isGraduated) {
    await sendContractTx(params.signer, REFLOW.dexRouter, DEX_ROUTER_ABI, "sell", [
      amountIn,
      params.tokenAddress,
      params.account,
      deadline(),
    ]);
    return;
  }

  await sendContractTx(params.signer, REFLOW.core, CORE_ABI, "sell", [
    amountIn,
    params.tokenAddress,
    params.account,
    deadline(),
  ]);
}

export async function listToken(params: { signer: ethers.Signer; curveAddress: string }) {
  if (!isSetAddress(params.curveAddress)) throw new Error("Invalid curve address");
  const receipt = await sendContractTx(params.signer, params.curveAddress, CURVE_ABI, "listing", []);
  return receipt;
}

/**
 * Ensure curve is locked (buy remaining tokens to target if needed), then call listing().
 * Fixes ERR_LISTING_ONLY_LOCK when UI progress is ~99% but lock flag is still false.
 */
export async function launchPool(params: {
  signer: ethers.Signer;
  account: string;
  tokenAddress: string;
  curveAddress: string;
}) {
  if (!isSetAddress(params.curveAddress) || !isSetAddress(params.tokenAddress)) {
    throw new Error("Invalid curve or token address");
  }

  const provider = getPublicProvider();
  const curve = new ethers.Contract(params.curveAddress, CURVE_ABI, provider);
  const core = new ethers.Contract(REFLOW.core, CORE_ABI, provider);

  let locked = (await curve.getLock()) as boolean;
  if (!locked) {
    const [reserves, target] = await Promise.all([
      curve.getReserves() as Promise<[bigint, bigint]>,
      curve.getTargetToken() as Promise<bigint>,
    ]);
    const reserveToken = reserves[1];
    if (reserveToken <= target) {
      throw new Error("Curve should be locked already. Refresh and try again.");
    }

    const tokensToBuy = reserveToken - target;
    const [, virtualNative, virtualToken, k] = (await core.getCurveData(
      REFLOW.bondingCurveFactory,
      params.tokenAddress,
    )) as [string, bigint, bigint, bigint];

    const amountIn = (await core.getAmountIn(tokensToBuy, k, virtualNative, virtualToken)) as bigint;
    let feeDen = 1n;
    let feeNum = 100n;
    try {
      const feeCfg = await curve.getFeeConfig();
      feeDen = BigInt(feeCfg.denominator ?? feeCfg[0] ?? 1);
      feeNum = BigInt(feeCfg.numerator ?? feeCfg[1] ?? 100);
    } catch {
      /* defaults */
    }
    let fee = calcFee(amountIn, feeDen, feeNum);
    if (fee === ZERO) fee = 1n;

    // Small buffer for rounding; unused native is refunded by exactOutBuy
    const amountInMax = amountIn + fee + ethers.parseEther("0.002");

    await sendContractTx(
      params.signer,
      REFLOW.core,
      CORE_ABI,
      "exactOutBuy",
      [amountInMax, tokensToBuy, params.tokenAddress, params.account, deadline()],
      { value: amountInMax },
    );

    locked = (await curve.getLock()) as boolean;
    if (!locked) {
      throw new Error("Buy completed but curve did not lock. Refresh and retry Launch pool.");
    }
  }

  return sendContractTx(params.signer, params.curveAddress, CURVE_ABI, "listing", []);
}

export async function markTokenInactive(params: { signer: ethers.Signer; tokenAddress: string }) {
  await sendContractTx(params.signer, REFLOW.lpVault, VAULT_ABI, "markInactive", [params.tokenAddress]);
}

export async function proposeRecycle(params: {
  signer: ethers.Signer;
  deadToken: string;
  candidates: string[];
}) {
  if (!params.candidates.length) throw new Error("Pick at least one candidate token");
  const receipt = await sendContractTx(params.signer, REFLOW.governor, GOVERNOR_ABI, "propose", [
    params.deadToken,
    params.candidates,
  ]);
  return receipt;
}

export async function voteOnProposal(params: {
  signer: ethers.Signer;
  proposalId: number;
  candidate: string;
  stakeMon: string;
}) {
  const stake = ethers.parseEther(params.stakeMon || "0.01");
  await sendContractTx(
    params.signer,
    REFLOW.governor,
    GOVERNOR_ABI,
    "vote",
    [params.proposalId, params.candidate],
    { value: stake },
  );
}

export async function executeProposal(params: { signer: ethers.Signer; proposalId: number }) {
  await sendContractTx(params.signer, REFLOW.governor, GOVERNOR_ABI, "execute", [params.proposalId]);
}

/** Progress toward lock: tokens sold / (supply - target). */
export async function getCurveProgress(tokenAddress: string) {
  const provider = getPublicProvider();
  const core = new ethers.Contract(REFLOW.core, CORE_ABI, provider);
  const factory = new ethers.Contract(REFLOW.bondingCurveFactory, FACTORY_ABI, provider);
  const [curve] = await core.getCurveData(REFLOW.bondingCurveFactory, tokenAddress);
  if (!isSetAddress(curve)) {
    return { listed: false, locked: false, progress: 0, curve: "", pair: "", targetToken: "0", reserveToken: "0" };
  }

  const curveC = new ethers.Contract(curve, CURVE_ABI, provider);
  const [listed, locked, reserves, target, pair, cfg] = await Promise.all([
    curveC.getIsListing() as Promise<boolean>,
    curveC.getLock() as Promise<boolean>,
    curveC.getReserves() as Promise<[bigint, bigint]>,
    curveC.getTargetToken() as Promise<bigint>,
    curveC.pair().catch(() => ethers.ZeroAddress) as Promise<string>,
    factory.getConfig().catch(() => null),
  ]);

  const totalSupply = cfg ? BigInt(cfg.tokenTotalSupply) : 0n;
  const tokenReserves = reserves[1];
  let progress = 0;
  if (listed || locked) {
    progress = 100;
  } else if (totalSupply > target && target >= 0n) {
    const sold = totalSupply > tokenReserves ? totalSupply - tokenReserves : 0n;
    const capacity = totalSupply - target;
    progress = capacity > 0n ? Math.min(100, Number((sold * 10000n) / capacity) / 100) : 0;
  }

  return {
    listed,
    locked,
    progress,
    curve: curve as string,
    pair: isSetAddress(pair) ? pair : "",
    targetToken: target.toString(),
    reserveToken: tokenReserves.toString(),
    reserveNative: reserves[0].toString(),
  };
}

async function getTradeFeeParts(isGraduated: boolean): Promise<{ den: bigint; num: bigint }> {
  const provider = getPublicProvider();
  try {
    if (isGraduated) {
      const router = new ethers.Contract(REFLOW.dexRouter, DEX_ROUTER_ABI, provider);
      const cfg = await router.getFeeConfig();
      return {
        den: BigInt(cfg.denominator ?? cfg[0] ?? 1),
        num: BigInt(cfg.numerator ?? cfg[1] ?? 100),
      };
    }
    const factory = new ethers.Contract(REFLOW.bondingCurveFactory, FACTORY_ABI, provider);
    const cfg = await factory.getConfig();
    return {
      den: BigInt(cfg.feeDenominator ?? 1),
      num: BigInt(cfg.feeNumerator ?? 100),
    };
  } catch {
    return { den: 1n, num: 100n };
  }
}

/** Max MON amountIn that still leaves room for protocol fee + small gas buffer. */
export async function maxBuyAmountIn(nativeBalance: bigint, isGraduated: boolean): Promise<bigint> {
  if (nativeBalance <= ZERO) return ZERO;
  const { den, num } = await getTradeFeeParts(isGraduated);
  const gasReserve = ethers.parseEther("0.002");
  const spendable = nativeBalance > gasReserve ? nativeBalance - gasReserve : ZERO;
  if (spendable === ZERO || num === ZERO) return ZERO;
  // amountIn + fee = amountIn * (num + den) / num
  return (spendable * num) / (num + den);
}

export async function readErc20Meta(tokenAddress: string): Promise<{ name: string; symbol: string; decimals: number } | null> {
  if (!isSetAddress(tokenAddress)) return null;
  try {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, getPublicProvider());
    const [name, symbol, decimals] = await Promise.all([
      token.name() as Promise<string>,
      token.symbol() as Promise<string>,
      token.decimals() as Promise<number>,
    ]);
    return { name, symbol, decimals: Number(decimals) };
  } catch {
    return null;
  }
}

export async function quoteTrade(params: {
  tokenAddress: string;
  amount: string;
  tradeType: "buy" | "sell";
  isGraduated: boolean;
}): Promise<bigint | undefined> {
  if (!params.amount || Number(params.amount) <= 0 || !isSetAddress(params.tokenAddress)) return undefined;
  try {
    const provider = getPublicProvider();
    const { den, num } = await getTradeFeeParts(params.isGraduated);

    if (params.isGraduated) {
      const factory = new ethers.Contract(REFLOW.dexFactory, DEX_FACTORY_ABI, provider);
      const pairAddr = (await factory.getPair(params.tokenAddress, REFLOW.wNative)) as string;
      if (!isSetAddress(pairAddr)) return undefined;
      const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);
      const [token0, reserves] = await Promise.all([
        pair.token0() as Promise<string>,
        pair.getReserves() as Promise<[bigint, bigint, number]>,
      ]);
      const tokenIs0 = token0.toLowerCase() === params.tokenAddress.toLowerCase();
      const reserveToken = tokenIs0 ? reserves[0] : reserves[1];
      const reserveNative = tokenIs0 ? reserves[1] : reserves[0];
      if (params.tradeType === "buy") {
        const amountIn = ethers.parseEther(params.amount);
        return v2AmountOut(amountIn, reserveNative, reserveToken);
      }
      const amountIn = ethers.parseUnits(params.amount, 18);
      const gross = v2AmountOut(amountIn, reserveToken, reserveNative);
      const fee = calcFee(gross, den, num);
      return gross > fee ? gross - fee : ZERO;
    }

    const core = new ethers.Contract(REFLOW.core, CORE_ABI, provider);
    const [curve, virtualNative, virtualToken, k] = (await core.getCurveData(
      REFLOW.bondingCurveFactory,
      params.tokenAddress,
    )) as [string, bigint, bigint, bigint];
    if (!isSetAddress(curve)) return undefined;

    if (params.tradeType === "buy") {
      const amountIn = ethers.parseEther(params.amount);
      return (await core.getAmountOut(amountIn, k, virtualNative, virtualToken)) as bigint;
    }
    const amountIn = ethers.parseUnits(params.amount, 18);
    const gross = (await core.getAmountOut(amountIn, k, virtualToken, virtualNative)) as bigint;
    const fee = calcFee(gross, den, num);
    return gross > fee ? gross - fee : ZERO;
  } catch {
    return undefined;
  }
}

export type TokenLifecycle = {
  token: string;
  curve: string;
  pair: string;
  listed: boolean;
  locked: boolean;
  progress: number;
  reserveNative: string;
  reserveToken: string;
  targetToken: string;
  vaultStatus: string;
  vaultStatusCode: number;
  inactive: boolean;
  recyclingEligible: boolean;
  volumeNativeInWindow: string;
  txCountInWindow: number;
  lastSwapAt: number;
  proposalId: number | null;
  proposalState: string | null;
  proposalCandidates: string[];
  proposalEndTime: number | null;
  proposalWinner: string;
  minVoteStake: string;
};

const emptyLifecycle = (token: string): TokenLifecycle => ({
  token,
  curve: "",
  pair: "",
  listed: false,
  locked: false,
  progress: 0,
  reserveNative: "0",
  reserveToken: "0",
  targetToken: "0",
  vaultStatus: "None",
  vaultStatusCode: 0,
  inactive: false,
  recyclingEligible: false,
  volumeNativeInWindow: "0",
  txCountInWindow: 0,
  lastSwapAt: 0,
  proposalId: null,
  proposalState: null,
  proposalCandidates: [],
  proposalEndTime: null,
  proposalWinner: "",
  minVoteStake: "0.01",
});

export async function getTokenLifecycle(tokenAddress: string): Promise<TokenLifecycle> {
  const base = emptyLifecycle(tokenAddress);
  if (!isSetAddress(tokenAddress)) return base;

  try {
    const progress = await getCurveProgress(tokenAddress);
    Object.assign(base, {
      curve: progress.curve,
      pair: progress.pair,
      listed: progress.listed,
      locked: progress.locked,
      progress: progress.progress,
      reserveNative: progress.reserveNative || "0",
      reserveToken: progress.reserveToken,
      targetToken: progress.targetToken,
    });
  } catch {
    /* bonding data optional */
  }

  const provider = getPublicProvider();

  try {
    const vault = new ethers.Contract(REFLOW.lpVault, VAULT_ABI, provider);
    const pos = await vault.getPosition(tokenAddress);
    const statusCode = Number(pos.status ?? pos[5] ?? 0);
    base.vaultStatusCode = statusCode;
    base.vaultStatus = VAULT_STATUS_LABELS[statusCode] || "None";
    if (!base.pair && isSetAddress(pos.pair ?? pos[1])) {
      base.pair = (pos.pair ?? pos[1]) as string;
    }
  } catch {
    /* vault optional */
  }

  try {
    const monitor = new ethers.Contract(REFLOW.activityMonitor, ACTIVITY_MONITOR_ABI, provider);
    const activity = await monitor.getActivity(tokenAddress);
    base.inactive = Boolean(activity.inactive ?? activity[4]);
    base.recyclingEligible = Boolean(activity.recyclingEligible ?? activity[5]);
    base.volumeNativeInWindow = String(activity.volumeNativeInWindow ?? activity[2] ?? 0n);
    base.txCountInWindow = Number(activity.txCountInWindow ?? activity[3] ?? 0);
    base.lastSwapAt = Number(activity.lastSwapAt ?? activity[0] ?? 0);
  } catch {
    /* activity optional */
  }

  try {
    const governor = new ethers.Contract(REFLOW.governor, GOVERNOR_ABI, provider);
    const [count, minStake] = await Promise.all([
      governor.proposalCount() as Promise<bigint>,
      governor.minVoteStake().catch(() => ethers.parseEther("0.01")) as Promise<bigint>,
    ]);
    base.minVoteStake = ethers.formatEther(minStake);

    const total = Number(count);
    for (let id = total; id >= 1 && id > total - 40; id--) {
      const p = await governor.getProposal(id);
      const dead = String(p.deadToken ?? p[1] ?? "").toLowerCase();
      if (dead !== tokenAddress.toLowerCase()) continue;
      const stateCode = Number(await governor.state(id));
      base.proposalId = id;
      base.proposalState = PROPOSAL_STATE_LABELS[stateCode] || String(stateCode);
      base.proposalCandidates = Array.from(p.candidates ?? p[2] ?? []).map(String);
      base.proposalEndTime = Number(p.endTime ?? p[4] ?? 0);
      base.proposalWinner = String(p.winner ?? p[5] ?? "");
      break;
    }
  } catch {
    /* governor optional */
  }

  return base;
}

/** Listed tokens still Locked in the vault — valid recycle vote candidates. */
export async function loadLockedCandidates(excludeToken?: string): Promise<{ address: string; name: string; symbol: string }[]> {
  const provider = getPublicProvider();
  const results: { address: string; name: string; symbol: string }[] = [];
  try {
    const created = await loadCreateEvents();
    const vault = new ethers.Contract(REFLOW.lpVault, VAULT_ABI, provider);
    for (const t of created) {
      if (excludeToken && t.address.toLowerCase() === excludeToken.toLowerCase()) continue;
      try {
        const locked = (await vault.isLocked(t.address)) as boolean;
        if (!locked) continue;
        results.push({ address: t.address, name: t.name, symbol: t.symbol });
        if (results.length >= 24) break;
      } catch {
        /* skip */
      }
    }
  } catch {
    return [];
  }
  return results;
}

export type ChainToken = {
  address: string;
  name: string;
  symbol: string;
  curve: string;
  tokenURI?: string;
  owner?: string;
};

export async function loadCreateEvents(): Promise<ChainToken[]> {
  if (!isSetAddress(REFLOW.bondingCurveFactory)) return [];
  try {
    const provider = getFreshPublicProvider();
    const factory = new ethers.Contract(REFLOW.bondingCurveFactory, FACTORY_ABI, provider);
    const latest = await provider.getBlockNumber();
    const from = Math.max(0, latest - 50_000);
    const events = await factory.queryFilter(factory.filters.Create(), from, latest);
    return events
      .map(ev => {
        const parsed = factory.interface.parseLog({
          topics: ev.topics as string[],
          data: ev.data,
        });
        if (!parsed) return null;
        const item: ChainToken = {
          address: parsed.args.token as string,
          name: parsed.args.name as string,
          symbol: parsed.args.symbol as string,
          curve: parsed.args.curve as string,
          tokenURI: parsed.args.tokenURI as string,
          owner: parsed.args.owner as string,
        };
        return item;
      })
      .filter((t): t is ChainToken => t != null)
      .reverse();
  } catch {
    return [];
  }
}

async function queryRange() {
  const provider = getFreshPublicProvider();
  const latest = await provider.getBlockNumber();
  const from = Math.max(0, latest - 50_000);
  return { provider, from, latest };
}

export type VaultLpRegistered = { token: string; pair: string; liquidity: string; creator: string };
export type VaultLpInactive = { token: string };
export type VaultLpRecycled = { deadToken: string; winnerToken: string; nativeAmount: string; newLiquidity: string };

export async function loadVaultEvents(): Promise<{
  registered: VaultLpRegistered[];
  inactive: VaultLpInactive[];
  recycled: VaultLpRecycled[];
}> {
  const empty = { registered: [] as VaultLpRegistered[], inactive: [] as VaultLpInactive[], recycled: [] as VaultLpRecycled[] };
  if (!isSetAddress(REFLOW.lpVault)) return empty;
  try {
    const { provider, from, latest } = await queryRange();
    const vault = new ethers.Contract(REFLOW.lpVault, VAULT_ABI, provider);
    const [regLogs, inactLogs, recycLogs] = await Promise.all([
      vault.queryFilter(vault.filters.LPRegistered(), from, latest),
      vault.queryFilter(vault.filters.LPInactive(), from, latest),
      vault.queryFilter(vault.filters.LPRecycled(), from, latest),
    ]);

    const registered = regLogs
      .map(ev => {
        const p = vault.interface.parseLog({ topics: ev.topics as string[], data: ev.data });
        if (!p) return null;
        return {
          token: String(p.args.token ?? p.args[0]),
          pair: String(p.args.pair ?? p.args[1]),
          liquidity: String(p.args.liquidity ?? p.args[2] ?? 0),
          creator: String(p.args.creator ?? p.args[3] ?? ""),
        };
      })
      .filter((x): x is VaultLpRegistered => !!x);

    const inactive = inactLogs
      .map(ev => {
        const p = vault.interface.parseLog({ topics: ev.topics as string[], data: ev.data });
        if (!p) return null;
        return { token: String(p.args.token ?? p.args[0]) };
      })
      .filter((x): x is VaultLpInactive => !!x);

    const recycled = recycLogs
      .map(ev => {
        const p = vault.interface.parseLog({ topics: ev.topics as string[], data: ev.data });
        if (!p) return null;
        return {
          deadToken: String(p.args.deadToken ?? p.args[0]),
          winnerToken: String(p.args.winnerToken ?? p.args[1]),
          nativeAmount: String(p.args.nativeAmount ?? p.args[2] ?? 0),
          newLiquidity: String(p.args.newLiquidity ?? p.args[3] ?? 0),
        };
      })
      .filter((x): x is VaultLpRecycled => !!x);

    return { registered, inactive, recycled };
  } catch {
    return empty;
  }
}

export type GovernorProposalEvent = {
  id: number;
  deadToken: string;
  candidates: string[];
  endTime: number;
};

export type GovernorExecutedEvent = {
  id: number;
  winner: string;
  nativeRecycled: string;
  newLiquidity: string;
};

export async function loadGovernorEvents(): Promise<{
  created: GovernorProposalEvent[];
  executed: GovernorExecutedEvent[];
}> {
  const empty = { created: [] as GovernorProposalEvent[], executed: [] as GovernorExecutedEvent[] };
  if (!isSetAddress(REFLOW.governor)) return empty;
  try {
    const { provider, from, latest } = await queryRange();
    const governor = new ethers.Contract(REFLOW.governor, GOVERNOR_ABI, provider);
    const [createdLogs, executedLogs] = await Promise.all([
      governor.queryFilter(governor.filters.ProposalCreated(), from, latest),
      governor.queryFilter(governor.filters.ProposalExecuted(), from, latest),
    ]);

    const created = createdLogs
      .map(ev => {
        const p = governor.interface.parseLog({ topics: ev.topics as string[], data: ev.data });
        if (!p) return null;
        const candidates = Array.from(p.args.candidates ?? p.args[2] ?? []).map(String);
        return {
          id: Number(p.args.id ?? p.args[0]),
          deadToken: String(p.args.deadToken ?? p.args[1]),
          candidates,
          endTime: Number(p.args.endTime ?? p.args[3] ?? 0),
        };
      })
      .filter((x): x is GovernorProposalEvent => !!x);

    const executed = executedLogs
      .map(ev => {
        const p = governor.interface.parseLog({ topics: ev.topics as string[], data: ev.data });
        if (!p) return null;
        return {
          id: Number(p.args.id ?? p.args[0]),
          winner: String(p.args.winner ?? p.args[1]),
          nativeRecycled: String(p.args.nativeRecycled ?? p.args[2] ?? 0),
          newLiquidity: String(p.args.newLiquidity ?? p.args[3] ?? 0),
        };
      })
      .filter((x): x is GovernorExecutedEvent => !!x);

    return { created, executed };
  } catch {
    return empty;
  }
}

export type TokenMarketStats = {
  listed: boolean;
  curve: string;
  pair: string;
  priceNative: number;
  marketCapNative: number;
  marketCapUsd: number;
  liquidityNative: number;
  liquidityUsd: number;
  volumeNative: number;
  volumeUsd: number;
  txCountInWindow: number;
  totalSupply: string;
  virtualNative: string;
  virtualToken: string;
  reserveNative: string;
  reserveToken: string;
  progress: number;
  priceLabel: string;
  marketCapLabel: string;
  liquidityLabel: string;
  volumeLabel: string;
};

function asFloatEther(value: bigint): number {
  try {
    return Number(ethers.formatEther(value));
  } catch {
    return 0;
  }
}

/** Spot price, FDV/mcap, liquidity & window volume from curve or DEX pair. */
export async function getTokenMarketStats(tokenAddress: string): Promise<TokenMarketStats | null> {
  if (!isSetAddress(tokenAddress)) return null;
  const provider = getPublicProvider();
  const monUsd = monUsdPrice();
  const empty: TokenMarketStats = {
    listed: false,
    curve: "",
    pair: "",
    priceNative: 0,
    marketCapNative: 0,
    marketCapUsd: 0,
    liquidityNative: 0,
    liquidityUsd: 0,
    volumeNative: 0,
    volumeUsd: 0,
    txCountInWindow: 0,
    totalSupply: "0",
    virtualNative: "0",
    virtualToken: "0",
    reserveNative: "0",
    reserveToken: "0",
    progress: 0,
    priceLabel: "—",
    marketCapLabel: "$—",
    liquidityLabel: "—",
    volumeLabel: "$—",
  };

  try {
    const core = new ethers.Contract(REFLOW.core, CORE_ABI, provider);
    const factory = new ethers.Contract(REFLOW.bondingCurveFactory, FACTORY_ABI, provider);
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    let totalSupply = 0n;
    try {
      const cfg = await factory.getConfig();
      totalSupply = BigInt(cfg.tokenTotalSupply ?? 0);
    } catch {
      /* fall through */
    }
    if (totalSupply === 0n) {
      try {
        totalSupply = (await token.totalSupply()) as bigint;
      } catch {
        /* optional */
      }
    }

    const [curve, virtualNative, virtualToken] = (await core.getCurveData(
      REFLOW.bondingCurveFactory,
      tokenAddress,
    )) as [string, bigint, bigint, bigint];

    empty.curve = isSetAddress(curve) ? curve : "";
    empty.virtualNative = virtualNative?.toString?.() || "0";
    empty.virtualToken = virtualToken?.toString?.() || "0";
    empty.totalSupply = totalSupply.toString();

    let listed = false;
    let locked = false;
    let pair = "";
    let reserveNative = 0n;
    let reserveToken = 0n;
    let targetToken = 0n;

    if (isSetAddress(curve)) {
      const curveC = new ethers.Contract(curve, CURVE_ABI, provider);
      const [isListed, isLocked, reserves, target, pairAddr] = await Promise.all([
        curveC.getIsListing() as Promise<boolean>,
        curveC.getLock() as Promise<boolean>,
        curveC.getReserves() as Promise<[bigint, bigint]>,
        curveC.getTargetToken() as Promise<bigint>,
        curveC.pair().catch(() => ethers.ZeroAddress) as Promise<string>,
      ]);
      listed = isListed;
      locked = isLocked;
      reserveNative = reserves[0];
      reserveToken = reserves[1];
      targetToken = target;
      pair = isSetAddress(pairAddr) ? pairAddr : "";
    }

    empty.listed = listed;
    empty.pair = pair;
    empty.reserveNative = reserveNative.toString();
    empty.reserveToken = reserveToken.toString();

    if (listed || locked) {
      empty.progress = 100;
    } else if (totalSupply > targetToken && targetToken >= 0n) {
      const sold = totalSupply > reserveToken ? totalSupply - reserveToken : 0n;
      const capacity = totalSupply - targetToken;
      empty.progress = capacity > 0n ? Math.min(100, Number((sold * 10000n) / capacity) / 100) : 0;
    }

    const supplyFloat = asFloatEther(totalSupply);
    let priceNative = 0;
    let marketCapNative = 0;
    let liquidityNative = 0;

    if (listed && isSetAddress(pair)) {
      const pairC = new ethers.Contract(pair, PAIR_ABI, provider);
      const [token0, reserves] = await Promise.all([
        pairC.token0() as Promise<string>,
        pairC.getReserves() as Promise<[bigint, bigint, number]>,
      ]);
      const tokenIs0 = token0.toLowerCase() === tokenAddress.toLowerCase();
      const rToken = tokenIs0 ? reserves[0] : reserves[1];
      const rNative = tokenIs0 ? reserves[1] : reserves[0];
      const rTokenF = asFloatEther(rToken);
      const rNativeF = asFloatEther(rNative);
      if (rTokenF > 0) {
        priceNative = rNativeF / rTokenF;
        marketCapNative = priceNative * supplyFloat;
        liquidityNative = rNativeF * 2;
      }
    } else {
      const vN = asFloatEther(virtualNative);
      const vT = asFloatEther(virtualToken);
      if (vT > 0) {
        priceNative = vN / vT;
        marketCapNative = priceNative * supplyFloat;
      }
      liquidityNative = asFloatEther(reserveNative);
    }

    empty.priceNative = priceNative;
    empty.marketCapNative = marketCapNative;
    empty.marketCapUsd = marketCapNative * monUsd;
    empty.liquidityNative = liquidityNative;
    empty.liquidityUsd = liquidityNative * monUsd;

    try {
      const monitor = new ethers.Contract(REFLOW.activityMonitor, ACTIVITY_MONITOR_ABI, provider);
      const activity = await monitor.getActivity(tokenAddress);
      const volWei = BigInt(activity.volumeNativeInWindow ?? activity[2] ?? 0n);
      empty.volumeNative = asFloatEther(volWei);
      empty.volumeUsd = empty.volumeNative * monUsd;
      empty.txCountInWindow = Number(activity.txCountInWindow ?? activity[3] ?? 0);
    } catch {
      /* optional */
    }

    empty.priceLabel = formatTokenPrice(priceNative);
    empty.marketCapLabel = formatCompactUsd(empty.marketCapUsd);
    empty.liquidityLabel = listed
      ? formatCompactUsd(empty.liquidityUsd)
      : liquidityNative > 0
        ? formatCompactMon(liquidityNative)
        : "Bonding";
    empty.volumeLabel = empty.volumeUsd > 0 ? formatCompactUsd(empty.volumeUsd) : formatCompactMon(empty.volumeNative);

    return empty;
  } catch {
    return null;
  }
}

export function derivePhaseFromLifecycle(life: TokenLifecycle): string {
  if (life.vaultStatus === "Recycled") return "recycled";
  if (life.vaultStatus === "Recycling") return "recycling";
  if (life.proposalState === "Pending" || life.proposalState === "Active" || life.proposalState === "Succeeded") {
    return "voting";
  }
  if (life.inactive || life.vaultStatus === "Inactive") return "inactive";
  if (life.listed || life.vaultStatus === "Locked") return "listed";
  if (life.locked) return "locked";
  return "bonding";
}
