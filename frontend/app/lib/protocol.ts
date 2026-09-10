import { ethers } from "ethers";
import {
  DEX_FACTORY_ABI,
  ERC20_ABI,
  FACTORY_ABI,
  GOVERNOR_ABI,
  MONITOR_ABI,
  REFLOW,
  VAULT_ABI,
} from "@/app/config/reflow";
import { isSetAddress, ZERO } from "@/app/lib/format";
import type { TrackedToken } from "@/app/lib/tokens";

export type FactoryConfig = {
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

export type ProposalView = {
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

export type ProtocolSnapshot = {
  config: FactoryConfig;
  minVoteStake: bigint;
  proposalCount: bigint;
  votingPeriod: bigint;
  inactivityPeriod: bigint;
  minVolumeNative: bigint;
  minTxCount: bigint;
  wired: boolean;
  vaultTokens: TrackedToken[];
  launchedTokens: TrackedToken[];
  proposals: ProposalView[];
};

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export async function loadProtocol(provider: ethers.Provider): Promise<ProtocolSnapshot> {
  const factory = new ethers.Contract(REFLOW.bondingCurveFactory, FACTORY_ABI, provider);
  const cfg = await factory.getConfig();
  const config: FactoryConfig = {
    deployFee: cfg.deployFee,
    listingFee: cfg.listingFee,
    tokenTotalSupply: cfg.tokenTotalSupply,
    virtualNative: cfg.virtualNative,
    virtualToken: cfg.virtualToken,
    k: cfg.k,
    targetToken: cfg.targetToken,
    feeNumerator: BigInt(cfg.feeNumerator),
    feeDenominator: BigInt(cfg.feeDenominator),
  };

  const [core, dexFactory, lpVault] = await Promise.all([
    factory.getCore() as Promise<string>,
    factory.getDexFactory() as Promise<string>,
    factory.getLpVault() as Promise<string>,
  ]);

  const wired =
    same(core, REFLOW.core) &&
    same(dexFactory, REFLOW.dexFactory) &&
    same(lpVault, REFLOW.lpVault);

  let minVoteStake = ZERO;
  let proposalCount = ZERO;
  let votingPeriod = ZERO;
  const proposals: ProposalView[] = [];
  if (isSetAddress(REFLOW.governor)) {
    const governor = new ethers.Contract(REFLOW.governor, GOVERNOR_ABI, provider);
    const [stake, count, period] = await Promise.all([
      governor.minVoteStake() as Promise<bigint>,
      governor.proposalCount() as Promise<bigint>,
      governor.votingPeriod() as Promise<bigint>,
    ]);
    minVoteStake = stake;
    proposalCount = count;
    votingPeriod = period;
    const n = Number(count);
    for (let i = n; i >= 1 && i > n - 20; i--) {
      const [p, state] = await Promise.all([governor.getProposal(i), governor.state(i)]);
      proposals.push({
        id: p.id,
        deadToken: p.deadToken,
        candidates: p.candidates,
        startTime: p.startTime,
        endTime: p.endTime,
        winner: p.winner,
        executed: p.executed,
        cancelled: p.cancelled,
        state: Number(state),
      });
    }
  }

  let inactivityPeriod = ZERO;
  let minVolumeNative = ZERO;
  let minTxCount = ZERO;
  if (isSetAddress(REFLOW.activityMonitor)) {
    const monitor = new ethers.Contract(REFLOW.activityMonitor, MONITOR_ABI, provider);
    const defaults = await monitor.defaultConfig();
    inactivityPeriod = defaults.inactivityPeriod ?? defaults[0];
    minVolumeNative = defaults.minVolumeNative ?? defaults[1];
    minTxCount = defaults.minTxCount ?? defaults[2];
  }

  const vaultTokens = await loadVaultTokens(provider);
  const launchedTokens = await loadCreateEvents(provider);

  return {
    config,
    minVoteStake,
    proposalCount,
    votingPeriod,
    inactivityPeriod,
    minVolumeNative,
    minTxCount,
    wired,
    vaultTokens,
    launchedTokens,
    proposals,
  };
}

export async function loadVaultTokens(provider: ethers.Provider): Promise<TrackedToken[]> {
  if (!isSetAddress(REFLOW.lpVault)) return [];
  const vault = new ethers.Contract(REFLOW.lpVault, VAULT_ABI, provider);
  const count = Number(await vault.tokenCount());
  const tokens: TrackedToken[] = [];
  for (let i = 0; i < count; i++) {
    const address = (await vault.allTokens(i)) as string;
    if (!isSetAddress(address)) continue;
    const erc20 = new ethers.Contract(address, ERC20_ABI, provider);
    const [name, symbol] = await Promise.all([
      erc20.name() as Promise<string>,
      erc20.symbol() as Promise<string>,
    ]);
    tokens.push({ address, name, symbol, curve: "" });
  }
  return tokens;
}

export async function loadCreateEvents(provider: ethers.Provider): Promise<TrackedToken[]> {
  if (!isSetAddress(REFLOW.bondingCurveFactory)) return [];
  try {
    const factory = new ethers.Contract(REFLOW.bondingCurveFactory, FACTORY_ABI, provider);
    const latest = await provider.getBlockNumber();
    const from = Math.max(0, latest - 50_000);
    const events = await factory.queryFilter(factory.filters.Create(), from, latest);
    return events
      .map((ev) => {
        const parsed = factory.interface.parseLog({
          topics: ev.topics as string[],
          data: ev.data,
        });
        if (!parsed) return null;
        return {
          address: parsed.args.token as string,
          name: parsed.args.name as string,
          symbol: parsed.args.symbol as string,
          curve: parsed.args.curve as string,
        } satisfies TrackedToken;
      })
      .filter((t): t is TrackedToken => !!t);
  } catch {
    return [];
  }
}

export async function resolvePair(provider: ethers.Provider, token: string, currentPair: string) {
  if (isSetAddress(currentPair)) return currentPair;
  if (!isSetAddress(REFLOW.dexFactory) || !isSetAddress(token)) return currentPair;
  const factory = new ethers.Contract(REFLOW.dexFactory, DEX_FACTORY_ABI, provider);
  return (await factory.getPair(REFLOW.wNative, token)) as string;
}

export function mergeTokens(...lists: TrackedToken[][]) {
  const map = new Map<string, TrackedToken>();
  for (const list of lists) {
    for (const token of list) {
      if (!isSetAddress(token.address)) continue;
      const key = token.address.toLowerCase();
      const prev = map.get(key);
      map.set(key, {
        address: token.address,
        name: token.name || prev?.name || "",
        symbol: token.symbol || prev?.symbol || "",
        curve: token.curve || prev?.curve || "",
      });
    }
  }
  return [...map.values()];
}
