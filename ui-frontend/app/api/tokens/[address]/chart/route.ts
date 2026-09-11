import { NextResponse } from "next/server";
import { getIndexedChartSeries, type ChartTf } from "~~/lib/tokens/tradeSync";

export const dynamic = "force-dynamic";

const TFS = new Set(["5M", "1H", "6H", "1D", "ALL"]);

type Ctx = { params: { address: string } };

/** Indexed candle chart for a token (Mongo). */
export async function GET(req: Request, ctx: Ctx) {
  try {
    const { address } = ctx.params;
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }
    const url = new URL(req.url);
    const tfRaw = (url.searchParams.get("tf") || "1H").toUpperCase();
    const tf = (TFS.has(tfRaw) ? tfRaw : "1H") as ChartTf;
    const series = await getIndexedChartSeries(address, tf);
    return NextResponse.json({
      ok: true,
      source: "index",
      tf,
      series,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chart fetch failed";
    return NextResponse.json({ ok: false, error: message, series: [] }, { status: 500 });
  }
}
