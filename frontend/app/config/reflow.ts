import deployed from "../../../implementation/deployments/monadTestnet.json";

const env = (key: string, fallback: string) => {
  const value = process.env[key];
  return value && value.length > 0 ? value : fallback;
};

export type ReflowAddresses = {
  network: string;
  deployer: string;
  wNative: string;
  feeVault: string;
  dexFactory: string;
  core: string;
  bondingCurveFactory: string;
  dexRouter: string;
  lpVault: string;
  activityMonitor: string;
  governor: string;
};

export const REFLOW: ReflowAddresses = {
  network: deployed.network,
  deployer: env("NEXT_PUBLIC_DEPLOYER", deployed.deployer),
  wNative: env("NEXT_PUBLIC_WNATIVE", deployed.wNative),
  feeVault: env("NEXT_PUBLIC_FEE_VAULT", deployed.feeVault),
  dexFactory: env("NEXT_PUBLIC_DEX_FACTORY", deployed.dexFactory),
  core: env("NEXT_PUBLIC_CORE", deployed.core),
  bondingCurveFactory: env("NEXT_PUBLIC_BONDING_CURVE_FACTORY", deployed.bondingCurveFactory),
  dexRouter: env("NEXT_PUBLIC_DEX_ROUTER", deployed.dexRouter),
  lpVault: env("NEXT_PUBLIC_LP_VAULT", deployed.lpVault),
  activityMonitor: env("NEXT_PUBLIC_ACTIVITY_MONITOR", deployed.activityMonitor),
  governor: env("NEXT_PUBLIC_GOVERNOR", deployed.governor),
};

export const POSITION_STATUS = ["None", "Locked", "Inactive", "Recycling", "Recycled"] as const;
export const PROPOSAL_STATE = ["Pending", "Active", "Succeeded", "Defeated", "Executed", "Cancelled"] as const;

export const CORE_ABI = [
  "function createCurve(address creator, string name, string symbol, string tokenURI, uint256 amountIn, uint256 fee) payable returns (address curve, address token, uint256 virtualNative, uint256 virtualToken, uint256 amountOut)",
  "function buy(uint256 amountIn, uint256 fee, address token, address to, uint256 deadline) payable",
  "function exactOutBuy(uint256 amountInMax, uint256 amountOut, address token, address to, uint256 deadline) payable",
  "function sell(uint256 amountIn, address token, address to, uint256 deadline)",
  "function getCurveData(address factory, address token) view returns (address curve, uint256 virtualNative, uint256 virtualToken, uint256 k)",
  "function getAmountOut(uint256 amountIn, uint256 k, uint256 reserveIn, uint256 reserveOut) pure returns (uint256 amountOut)",
  "function getAmountIn(uint256 amountOut, uint256 k, uint256 reserveIn, uint256 reserveOut) pure returns (uint256 amountIn)",
  "function factory() view returns (address)",
  "function wNative() view returns (address)",
] as const;

export const FACTORY_ABI = [
  "function getCurve(address token) view returns (address curve)",
  "function getConfig() view returns (tuple(uint256 deployFee, uint256 listingFee, uint256 tokenTotalSupply, uint256 virtualNative, uint256 virtualToken, uint256 k, uint256 targetToken, uint16 feeNumerator, uint8 feeDenominator))",
  "function getDelpyFee() view returns (uint256)",
  "function getListingFee() view returns (uint256)",
  "function getFeeConfig() view returns (uint8 denominator, uint16 numerator)",
  "function getCore() view returns (address)",
  "function getDexFactory() view returns (address)",
  "function getLpVault() view returns (address)",
  "event Create(address indexed owner, address indexed curve, address indexed token, string tokenURI, string name, string symbol, uint256 virtualNative, uint256 virtualToken)",
] as const;

export const CURVE_ABI = [
  "function listing() returns (address pair)",
  "function getLock() view returns (bool)",
  "function getIsListing() view returns (bool)",
  "function getK() view returns (uint256)",
  "function getFeeConfig() view returns (uint8 denominator, uint16 numerator)",
  "function getVirtualReserves() view returns (uint256 virtualWNative, uint256 virtualToken)",
  "function getReserves() view returns (uint256 reserveWNative, uint256 reserveToken)",
  "function getTargetToken() view returns (uint256)",
  "function token() view returns (address)",
  "function pair() view returns (address)",
] as const;

export const DEX_ROUTER_ABI = [
  "function buy(uint256 amountIn, uint256 fee, address token, address to, uint256 deadline) payable",
  "function sell(uint256 amountIn, address token, address to, uint256 deadline)",
  "function getFeeConfig() view returns (uint256 denominator, uint256 numerator)",
  "function dexFactory() view returns (address)",
  "function WNATIVE() view returns (address)",
] as const;

export const VAULT_ABI = [
  "function markInactive(address token)",
  "function getPosition(address token) view returns (tuple(address token, address pair, address creator, uint256 liquidity, uint256 lockedAt, uint8 status))",
  "function isLocked(address token) view returns (bool)",
  "function tokenCount() view returns (uint256)",
  "function allTokens(uint256 index) view returns (address)",
] as const;

export const MONITOR_ABI = [
  "function getActivity(address token) view returns (tuple(uint256 lastSwapAt, uint256 windowStartedAt, uint256 volumeNativeInWindow, uint256 txCountInWindow, bool inactive, bool recyclingEligible))",
  "function isRecyclingEligible(address token) view returns (bool)",
  "function defaultConfig() view returns (uint256 inactivityPeriod, uint256 minVolumeNative, uint256 minTxCount)",
] as const;

export const GOVERNOR_ABI = [
  "function propose(address deadToken, address[] candidates) returns (uint256 proposalId)",
  "function vote(uint256 proposalId, address candidate) payable",
  "function execute(uint256 proposalId) returns (address winner)",
  "function getProposal(uint256 proposalId) view returns (tuple(uint256 id, address deadToken, address[] candidates, uint256 startTime, uint256 endTime, address winner, bool executed, bool cancelled))",
  "function votes(uint256 proposalId, address candidate) view returns (uint256)",
  "function state(uint256 proposalId) view returns (uint8)",
  "function proposalCount() view returns (uint256)",
  "function minVoteStake() view returns (uint256)",
  "function votingPeriod() view returns (uint256)",
  "function hasVoted(uint256 proposalId, address account) view returns (bool)",
  "event ProposalCreated(uint256 indexed id, address indexed deadToken, address[] candidates, uint256 endTime)",
] as const;

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
] as const;

export const PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
] as const;

export const DEX_FACTORY_ABI = ["function getPair(address tokenA, address tokenB) view returns (address)"] as const;

export function v2AmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint) {
  if (amountIn <= BigInt(0) || reserveIn <= BigInt(0) || reserveOut <= BigInt(0)) return BigInt(0);
  const amountInWithFee = amountIn * BigInt(997);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * BigInt(1000) + amountInWithFee;
  return numerator / denominator;
}
