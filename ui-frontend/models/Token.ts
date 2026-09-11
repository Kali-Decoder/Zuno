import { Schema, models, model, type InferSchemaType } from "mongoose";

/** High-level UI / filter phase derived from on-chain flags. */
export const TOKEN_PHASES = [
  "bonding",
  "locked",
  "listed",
  "inactive",
  "voting",
  "recycling",
  "recycled",
] as const;
export type TokenPhase = (typeof TOKEN_PHASES)[number];

/** Mirrors ILPRecyclingVault.PositionStatus */
export const POSITION_STATUSES = ["None", "Locked", "Inactive", "Recycling", "Recycled"] as const;
export type PositionStatus = (typeof POSITION_STATUSES)[number];

/** Mirrors IRecyclingGovernor.ProposalState */
export const PROPOSAL_STATES = [
  "Pending",
  "Active",
  "Succeeded",
  "Defeated",
  "Executed",
  "Cancelled",
] as const;
export type ProposalState = (typeof PROPOSAL_STATES)[number];

export type TokenProposal = {
  id: number;
  state: ProposalState;
  stateCode?: number;
  deadToken?: string;
  candidates: string[];
  startTime?: Date;
  endTime?: Date;
  winner?: string;
  executed: boolean;
  cancelled: boolean;
  /** candidate address (lowercase) → stake in wei (string) */
  candidateVotes?: Map<string, string> | Record<string, string>;
  proposedAt?: Date;
  executedAt?: Date;
};

export type TokenDoc = {
  // Identity
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  chainId: number;
  curve?: string;
  pair?: string;
  imageUrl?: string;
  description?: string;
  creator?: string;
  tokenURI?: string;
  txHash?: string;
  createBlock?: number;

  // Lifecycle phase
  phase: TokenPhase;
  graduated: boolean;
  curveLocked: boolean;
  isListing: boolean;
  lockedAtCurve?: Date;
  listedAt?: Date;
  listingTxHash?: string;

  // Curve reserves (uint256 as string)
  targetToken?: string;
  reserveNative?: string;
  reserveToken?: string;
  virtualNative?: string;
  virtualToken?: string;
  progress?: number;

  // Market metrics
  marketCapUsd?: number;
  volumeUsd?: number;
  lastBuyAt?: Date;

  // Vault (ILPRecyclingVault.LockedLP)
  vaultStatus: PositionStatus;
  vaultStatusCode?: number;
  vaultPair?: string;
  vaultCreator?: string;
  vaultLiquidity?: string;
  vaultLockedAt?: Date;
  recycledTo?: string;
  recycledFrom?: string[];
  nativeRecycledIn?: string;
  recycledAt?: Date;

  // Activity monitor (IActivityMonitor.PoolActivity)
  inactive: boolean;
  recyclingEligible: boolean;
  lastSwapAt?: Date;
  windowStartedAt?: Date;
  volumeNativeInWindow?: string;
  txCountInWindow?: number;
  markedInactiveAt?: Date;
  inactivityPeriod?: number;
  minVolumeNative?: string;
  minTxCount?: number;

  // Governor — latest proposal where this token is the dead token
  proposal?: TokenProposal | null;
  activeAsCandidateIn?: number[];
  wonProposalId?: number;

  // Sync
  lifecycleSyncedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
};

const ProposalSchema = new Schema(
  {
    id: { type: Number, required: true },
    state: { type: String, enum: PROPOSAL_STATES, default: "Pending" },
    stateCode: { type: Number },
    deadToken: { type: String, lowercase: true, default: "" },
    candidates: { type: [String], default: [] },
    startTime: { type: Date },
    endTime: { type: Date },
    winner: { type: String, lowercase: true, default: "" },
    executed: { type: Boolean, default: false },
    cancelled: { type: Boolean, default: false },
    candidateVotes: { type: Map, of: String, default: undefined },
    proposedAt: { type: Date },
    executedAt: { type: Date },
  },
  { _id: false },
);

const TokenSchema = new Schema<TokenDoc>(
  {
    address: { type: String, required: true, unique: true, index: true, lowercase: true },
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    decimals: { type: Number, default: 18 },
    chainId: { type: Number, default: 10143, index: true },
    curve: { type: String, default: "", lowercase: true },
    pair: { type: String, default: "", lowercase: true },
    imageUrl: { type: String, default: "/gmonad.jpeg" },
    description: { type: String, default: "" },
    creator: { type: String, default: "", lowercase: true },
    tokenURI: { type: String, default: "" },
    txHash: { type: String, default: "" },
    createBlock: { type: Number },

    phase: {
      type: String,
      enum: TOKEN_PHASES,
      default: "bonding",
      index: true,
    },
    graduated: { type: Boolean, default: false, index: true },
    curveLocked: { type: Boolean, default: false },
    isListing: { type: Boolean, default: false },
    lockedAtCurve: { type: Date },
    listedAt: { type: Date },
    listingTxHash: { type: String, default: "" },

    targetToken: { type: String, default: "" },
    reserveNative: { type: String, default: "0" },
    reserveToken: { type: String, default: "0" },
    virtualNative: { type: String, default: "0" },
    virtualToken: { type: String, default: "0" },
    progress: { type: Number, default: 0 },

    marketCapUsd: { type: Number, default: 0 },
    volumeUsd: { type: Number, default: 0 },
    lastBuyAt: { type: Date },

    vaultStatus: {
      type: String,
      enum: POSITION_STATUSES,
      default: "None",
      index: true,
    },
    vaultStatusCode: { type: Number, default: 0 },
    vaultPair: { type: String, default: "", lowercase: true },
    vaultCreator: { type: String, default: "", lowercase: true },
    vaultLiquidity: { type: String, default: "0" },
    vaultLockedAt: { type: Date },
    recycledTo: { type: String, default: "", lowercase: true },
    recycledFrom: { type: [String], default: [] },
    nativeRecycledIn: { type: String, default: "0" },
    recycledAt: { type: Date },

    inactive: { type: Boolean, default: false, index: true },
    recyclingEligible: { type: Boolean, default: false, index: true },
    lastSwapAt: { type: Date },
    windowStartedAt: { type: Date },
    volumeNativeInWindow: { type: String, default: "0" },
    txCountInWindow: { type: Number, default: 0 },
    markedInactiveAt: { type: Date },
    inactivityPeriod: { type: Number },
    minVolumeNative: { type: String, default: "" },
    minTxCount: { type: Number },

    proposal: { type: ProposalSchema, default: null },
    activeAsCandidateIn: { type: [Number], default: [] },
    wonProposalId: { type: Number },

    lifecycleSyncedAt: { type: Date },
  },
  { timestamps: true },
);

TokenSchema.index({ phase: 1, graduated: 1, createdAt: -1 });
TokenSchema.index({ recyclingEligible: 1, inactive: 1 });

/** Derive UI phase from on-chain-ish flags stored on the doc. */
export function deriveTokenPhase(
  input: Pick<
    TokenDoc,
    | "curveLocked"
    | "graduated"
    | "isListing"
    | "inactive"
    | "vaultStatus"
    | "proposal"
  >,
): TokenPhase {
  if (input.vaultStatus === "Recycled") return "recycled";
  if (input.vaultStatus === "Recycling") return "recycling";

  const proposalState = input.proposal?.state;
  if (
    proposalState === "Pending" ||
    proposalState === "Active" ||
    proposalState === "Succeeded"
  ) {
    return "voting";
  }

  if (input.inactive || input.vaultStatus === "Inactive") return "inactive";

  if (input.graduated || input.isListing || input.vaultStatus === "Locked") return "listed";

  if (input.curveLocked) return "locked";

  return "bonding";
}

export type TokenLean = InferSchemaType<typeof TokenSchema>;

export const TokenModel = models.Token || model<TokenDoc>("Token", TokenSchema);
