import { NextResponse } from "next/server";
import { syncChainToMongo } from "~~/lib/tokens/mongoSync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Sync Create + vault + governor events (and bonding progress) into MongoDB. */
export async function POST() {
  try {
    const result = await syncChainToMongo();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
