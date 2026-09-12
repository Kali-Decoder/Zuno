import { NextResponse } from "next/server";
import { resolveHolders } from "~~/lib/tokens/holders";

export const dynamic = "force-dynamic";

type Ctx = { params: { address: string } };

/** Token holders breakdown with live on-chain balances and tx references. */
export async function GET(req: Request, ctx: Ctx) {
  try {
    const { address } = ctx.params;
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const data = await resolveHolders(address);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Holders fetch failed";
    return NextResponse.json({ ok: false, error: message, holders: [] }, { status: 500 });
  }
}
