import { NextResponse } from "next/server";
import { loadCreateEvents } from "~~/lib/reflow/actions";
import { connectMongo } from "~~/lib/db/mongodb";
import { TokenModel } from "~~/models/Token";

export const dynamic = "force-dynamic";

/** Sync Create events from BondingCurveFactory into MongoDB. */
export async function POST() {
  try {
    await connectMongo();
    const events = await loadCreateEvents();
    let upserted = 0;

    for (const ev of events) {
      await TokenModel.findOneAndUpdate(
        { address: ev.address.toLowerCase() },
        {
          $setOnInsert: {
            address: ev.address.toLowerCase(),
            name: ev.name,
            symbol: ev.symbol,
            curve: ev.curve,
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
            curve: ev.curve,
          },
        },
        { upsert: true },
      );
      upserted += 1;
    }

    return NextResponse.json({ ok: true, upserted, total: events.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
