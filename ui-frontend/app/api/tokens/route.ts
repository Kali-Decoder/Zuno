import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "~~/lib/db/mongodb";
import { deriveTokenPhase, TokenModel, type TokenPhase, type PositionStatus, type ProposalState } from "~~/models/Token";

export const dynamic = "force-dynamic";

function asLower(value: unknown, fallback = "") {
  return value != null && String(value).length > 0 ? String(value).toLowerCase() : fallback;
}

function asString(value: unknown, fallback = "") {
  return value != null ? String(value) : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function asBool(value: unknown, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const graduated = searchParams.get("graduated");
    const phase = searchParams.get("phase");
    const inactive = searchParams.get("inactive");
    const recyclingEligible = searchParams.get("recyclingEligible");
    const vaultStatus = searchParams.get("vaultStatus");

    if (address) {
      const token = await TokenModel.findOne({ address: asLower(address) }).lean();
      return NextResponse.json({ token: token || null, tokens: token ? [token] : [] });
    }

    const q: Record<string, unknown> = { chainId: 5042002 };
    if (graduated === "true") q.graduated = true;
    if (graduated === "false") q.graduated = false;
    if (phase) q.phase = phase;
    if (inactive === "true") q.inactive = true;
    if (inactive === "false") q.inactive = false;
    if (recyclingEligible === "true") q.recyclingEligible = true;
    if (recyclingEligible === "false") q.recyclingEligible = false;
    if (vaultStatus) q.vaultStatus = vaultStatus;

    const tokens = await TokenModel.find(q).sort({ createdAt: -1 }).limit(200).lean();
    return NextResponse.json({ tokens });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load tokens";
    return NextResponse.json({ tokens: [], error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const body = await req.json();
    if (!body?.address || !body?.name || !body?.symbol) {
      return NextResponse.json({ error: "address, name, symbol required" }, { status: 400 });
    }

    const graduated = asBool(body.graduated, false) || asBool(body.isListing, false);
    const curveLocked = asBool(body.curveLocked, false);
    const isListing = asBool(body.isListing, graduated);
    const inactive = asBool(body.inactive, false);
    const recyclingEligible = asBool(body.recyclingEligible, false);
    const vaultStatus = (body.vaultStatus as PositionStatus) || "None";

    const proposal = body.proposal
      ? {
          id: asNumber(body.proposal.id),
          state: (body.proposal.state as ProposalState) || "Pending",
          stateCode: body.proposal.stateCode != null ? asNumber(body.proposal.stateCode) : undefined,
          deadToken: asLower(body.proposal.deadToken || body.address),
          candidates: Array.isArray(body.proposal.candidates)
            ? body.proposal.candidates.map((c: string) => String(c).toLowerCase())
            : [],
          startTime: asDate(body.proposal.startTime),
          endTime: asDate(body.proposal.endTime),
          winner: asLower(body.proposal.winner),
          executed: asBool(body.proposal.executed, false),
          cancelled: asBool(body.proposal.cancelled, false),
          candidateVotes: body.proposal.candidateVotes || undefined,
          proposedAt: asDate(body.proposal.proposedAt || body.proposal.startTime),
          executedAt: asDate(body.proposal.executedAt),
        }
      : undefined;

    const phase: TokenPhase =
      (body.phase as TokenPhase) ||
      deriveTokenPhase({
        curveLocked,
        graduated,
        isListing,
        inactive,
        vaultStatus,
        proposal: proposal || null,
      });

    const token = await TokenModel.findOneAndUpdate(
      { address: asLower(body.address) },
      {
        $set: {
          address: asLower(body.address),
          name: body.name,
          symbol: body.symbol,
          decimals: asNumber(body.decimals, 18),
          chainId: asNumber(body.chainId, 5042002),
          curve: asLower(body.curve),
          pair: asLower(body.pair),
          imageUrl: body.imageUrl || "/gmonad.jpeg",
          description: body.description || "",
          creator: asLower(body.creator),
          tokenURI: body.tokenURI || "",
          txHash: body.txHash || "",
          createBlock: body.createBlock != null ? asNumber(body.createBlock) : undefined,

          phase,
          graduated,
          curveLocked,
          isListing,
          lockedAtCurve: asDate(body.lockedAtCurve),
          listedAt: asDate(body.listedAt),
          listingTxHash: body.listingTxHash || "",

          targetToken: asString(body.targetToken, "0"),
          reserveNative: asString(body.reserveNative, "0"),
          reserveToken: asString(body.reserveToken, "0"),
          virtualNative: asString(body.virtualNative, "0"),
          virtualToken: asString(body.virtualToken, "0"),
          progress: asNumber(body.progress, 0),

          marketCapUsd: asNumber(body.marketCapUsd, 0),
          volumeUsd: asNumber(body.volumeUsd, 0),
          lastBuyAt: asDate(body.lastBuyAt) || new Date(),

          vaultStatus,
          vaultStatusCode: asNumber(body.vaultStatusCode, 0),
          vaultPair: asLower(body.vaultPair || body.pair),
          vaultCreator: asLower(body.vaultCreator),
          vaultLiquidity: asString(body.vaultLiquidity, "0"),
          vaultLockedAt: asDate(body.vaultLockedAt),
          recycledTo: asLower(body.recycledTo),
          recycledFrom: Array.isArray(body.recycledFrom)
            ? body.recycledFrom.map((a: string) => String(a).toLowerCase())
            : undefined,
          nativeRecycledIn: asString(body.nativeRecycledIn, "0"),
          recycledAt: asDate(body.recycledAt),

          inactive,
          recyclingEligible,
          lastSwapAt: asDate(body.lastSwapAt),
          windowStartedAt: asDate(body.windowStartedAt),
          volumeNativeInWindow: asString(body.volumeNativeInWindow, "0"),
          txCountInWindow: asNumber(body.txCountInWindow, 0),
          markedInactiveAt: asDate(body.markedInactiveAt),
          inactivityPeriod: body.inactivityPeriod != null ? asNumber(body.inactivityPeriod) : undefined,
          minVolumeNative: asString(body.minVolumeNative),
          minTxCount: body.minTxCount != null ? asNumber(body.minTxCount) : undefined,

          ...(proposal ? { proposal } : {}),
          activeAsCandidateIn: Array.isArray(body.activeAsCandidateIn)
            ? body.activeAsCandidateIn.map((n: number) => Number(n))
            : undefined,
          wonProposalId: body.wonProposalId != null ? asNumber(body.wonProposalId) : undefined,

          lifecycleSyncedAt: asDate(body.lifecycleSyncedAt) || new Date(),
        },
      },
      { upsert: true, new: true },
    );

    return NextResponse.json({ token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
