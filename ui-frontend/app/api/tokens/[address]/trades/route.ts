import { NextResponse } from "next/server";
import { getIndexedTrades } from "~~/lib/tokens/tradeSync";

export const dynamic = "force-dynamic";

type Ctx = { params: { address: string } };

/** Indexed trade feed for a token (Mongo). */
export async function GET(req: Request, ctx: Ctx) {
  try {
    const { address } = ctx.params;
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 40)));
    const trades = await getIndexedTrades(address, limit);
    return NextResponse.json({ ok: true, source: "index", trades });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trades fetch failed";
    return NextResponse.json({ ok: false, error: message, trades: [] }, { status: 500 });
  }
}
