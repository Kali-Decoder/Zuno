import {
  derivePhaseFromLifecycle,
  getCurveProgress,
  getTokenLifecycle,
  loadCreateEvents,
  loadGovernorEvents,
  loadVaultEvents,
  type TokenLifecycle,
} from "~~/lib/reflow/actions";
import { connectMongo } from "~~/lib/db/mongodb";
import { deriveTokenPhase, TokenModel, type TokenPhase } from "~~/models/Token";
import { PROPOSAL_STATE_LABELS } from "~~/config/reflow";

function lower(addr: string) {
  return addr.toLowerCase();
}

/** Build Mongo upsert body from on-chain lifecycle snapshot. */
export function lifecycleToMongoBody(
  life: TokenLifecycle,
  meta: { name: string; symbol: string; imageUrl?: string; description?: string; creator?: string },
) {
  const phase = derivePhaseFromLifecycle(life) as TokenPhase;
  return {
    address: lower(life.token),
    name: meta.name,
    symbol: meta.symbol,
    curve: life.curve ? lower(life.curve) : "",
    pair: life.pair ? lower(life.pair) : "",
    imageUrl: meta.imageUrl || "/gmonad.jpeg",
    description: meta.description || "",
    creator: meta.creator ? lower(meta.creator) : undefined,
    graduated: life.listed,
    isListing: life.listed,
    curveLocked: life.locked,
    progress: life.progress,
    phase,
    vaultStatus: life.vaultStatus,
    vaultStatusCode: life.vaultStatusCode,
    inactive: life.inactive,
    recyclingEligible: life.recyclingEligible,
    volumeNativeInWindow: life.volumeNativeInWindow,
    txCountInWindow: life.txCountInWindow,
    lastSwapAt: life.lastSwapAt ? new Date(life.lastSwapAt * 1000) : undefined,
    listedAt: life.listed ? new Date() : undefined,
    targetToken: life.targetToken,
    reserveToken: life.reserveToken,
    reserveNative: life.reserveNative,
    proposal: life.proposalId
      ? {
          id: life.proposalId,
          state: life.proposalState || "Pending",
          candidates: life.proposalCandidates.map(lower),
          endTime: life.proposalEndTime ? new Date(life.proposalEndTime * 1000) : undefined,
          winner: life.proposalWinner ? lower(life.proposalWinner) : "",
          executed: life.proposalState === "Executed",
          cancelled: life.proposalState === "Cancelled",
          deadToken: lower(life.token),
        }
      : null,
    lifecycleSyncedAt: new Date(),
  };
}

/**
 * Full chain → Mongo sync:
 * Create + vault (list/inactive/recycle) + governor proposals + progress refresh for bonding tokens.
 */
export async function syncChainToMongo() {
  await connectMongo();

  const creates = await loadCreateEvents();
  let created = 0;
  for (const ev of creates) {
    await TokenModel.findOneAndUpdate(
      { address: lower(ev.address) },
      {
        $setOnInsert: {
          address: lower(ev.address),
          imageUrl: "/gmonad.jpeg",
          graduated: false,
          curveLocked: false,
          isListing: false,
          phase: "bonding",
          vaultStatus: "None",
          inactive: false,
          recyclingEligible: false,
          progress: 0,
          chainId: 10143,
          decimals: 18,
        },
        $set: {
          name: ev.name,
          symbol: ev.symbol,
          curve: lower(ev.curve),
          creator: ev.owner ? lower(ev.owner) : undefined,
          tokenURI: ev.tokenURI || "",
          lifecycleSyncedAt: new Date(),
        },
      },
      { upsert: true },
    );
    created += 1;
  }

  const vault = await loadVaultEvents();
  let listed = 0;
  for (const ev of vault.registered) {
    await TokenModel.findOneAndUpdate(
      { address: lower(ev.token) },
      {
        $set: {
          pair: lower(ev.pair),
          vaultPair: lower(ev.pair),
          vaultCreator: lower(ev.creator),
          vaultLiquidity: ev.liquidity,
          vaultStatus: "Locked",
          vaultStatusCode: 1,
          graduated: true,
          isListing: true,
          curveLocked: true,
          progress: 100,
          phase: "listed",
          listedAt: new Date(),
          lifecycleSyncedAt: new Date(),
        },
        $setOnInsert: {
          address: lower(ev.token),
          name: "Token",
          symbol: "TKN",
          imageUrl: "/gmonad.jpeg",
          chainId: 10143,
          decimals: 18,
        },
      },
      { upsert: true },
    );
    listed += 1;
  }

  let inactivated = 0;
  for (const ev of vault.inactive) {
    await TokenModel.findOneAndUpdate(
      { address: lower(ev.token) },
      {
        $set: {
          inactive: true,
          recyclingEligible: true,
          vaultStatus: "Inactive",
          vaultStatusCode: 2,
          phase: "inactive",
          markedInactiveAt: new Date(),
          lifecycleSyncedAt: new Date(),
        },
      },
    );
    inactivated += 1;
  }

  let recycled = 0;
  for (const ev of vault.recycled) {
    await TokenModel.findOneAndUpdate(
      { address: lower(ev.deadToken) },
      {
        $set: {
          vaultStatus: "Recycled",
          vaultStatusCode: 4,
          phase: "recycled",
          recycledTo: lower(ev.winnerToken),
          nativeRecycledIn: ev.nativeAmount,
          recycledAt: new Date(),
          inactive: true,
          "proposal.executed": true,
          "proposal.state": "Executed",
          "proposal.winner": lower(ev.winnerToken),
          lifecycleSyncedAt: new Date(),
        },
      },
    );
    await TokenModel.findOneAndUpdate(
      { address: lower(ev.winnerToken) },
      {
        $addToSet: { recycledFrom: lower(ev.deadToken) },
        $set: { lifecycleSyncedAt: new Date() },
      },
    );
    recycled += 1;
  }

  const gov = await loadGovernorEvents();
  let proposals = 0;
  for (const ev of gov.created) {
    const stateLabel = PROPOSAL_STATE_LABELS[1] || "Active"; // Active after create
    await TokenModel.findOneAndUpdate(
      { address: lower(ev.deadToken) },
      {
        $set: {
          phase: "voting",
          inactive: true,
          recyclingEligible: true,
          vaultStatus: "Inactive",
          proposal: {
            id: ev.id,
            state: stateLabel,
            deadToken: lower(ev.deadToken),
            candidates: ev.candidates.map(lower),
            endTime: ev.endTime ? new Date(ev.endTime * 1000) : undefined,
            startTime: new Date(),
            winner: "",
            executed: false,
            cancelled: false,
            proposedAt: new Date(),
          },
          lifecycleSyncedAt: new Date(),
        },
      },
    );
    proposals += 1;
  }

  let executed = 0;
  for (const ev of gov.executed) {
    await TokenModel.findOneAndUpdate(
      { "proposal.id": ev.id },
      {
        $set: {
          phase: "recycled",
          vaultStatus: "Recycled",
          vaultStatusCode: 4,
          recycledTo: lower(ev.winner),
          "proposal.state": "Executed",
          "proposal.executed": true,
          "proposal.winner": lower(ev.winner),
          "proposal.executedAt": new Date(),
          lifecycleSyncedAt: new Date(),
        },
      },
    );
    executed += 1;
  }

  // Refresh bonding/locked progress for recent non-listed tokens (cap RPC)
  const bonding = await TokenModel.find({
    $or: [{ graduated: false }, { phase: { $in: ["bonding", "locked"] } }],
  })
    .sort({ updatedAt: -1 })
    .limit(40)
    .lean();

  let progressed = 0;
  for (const doc of bonding) {
    try {
      const p = await getCurveProgress(doc.address);
      const phase = p.listed ? "listed" : p.locked ? "locked" : "bonding";
      await TokenModel.updateOne(
        { address: doc.address },
        {
          $set: {
            curve: p.curve ? lower(p.curve) : doc.curve,
            pair: p.pair ? lower(p.pair) : doc.pair,
            progress: p.progress,
            curveLocked: p.locked,
            graduated: p.listed || doc.graduated,
            isListing: p.listed || doc.isListing,
            phase: p.listed ? "listed" : phase,
            targetToken: p.targetToken,
            reserveToken: p.reserveToken,
            reserveNative: p.reserveNative,
            lifecycleSyncedAt: new Date(),
          },
        },
      );
      progressed += 1;
    } catch {
      /* skip bad token */
    }
  }

  return {
    ok: true as const,
    created,
    listed,
    inactivated,
    recycled,
    proposals,
    executed,
    progressed,
    createEvents: creates.length,
  };
}

/** Refresh one token from chain into Mongo (used after txs). */
export async function syncTokenLifecycleToMongo(
  tokenAddress: string,
  meta: { name: string; symbol: string; imageUrl?: string; description?: string; creator?: string },
) {
  await connectMongo();
  const life = await getTokenLifecycle(tokenAddress);
  const body = lifecycleToMongoBody(life, meta);
  const phase = deriveTokenPhase({
    curveLocked: body.curveLocked,
    graduated: body.graduated,
    isListing: body.isListing,
    inactive: body.inactive,
    vaultStatus: body.vaultStatus as "None" | "Locked" | "Inactive" | "Recycling" | "Recycled",
    proposal: body.proposal as any,
  });
  body.phase = phase;

  const token = await TokenModel.findOneAndUpdate(
    { address: lower(tokenAddress) },
    { $set: body },
    { upsert: true, new: true },
  );
  return { life, token };
}
