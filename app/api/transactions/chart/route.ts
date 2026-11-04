import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getDashboardChartData, type ChartWindow } from "@/lib/data/chart-data";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const windowParam = searchParams.get("window") as ChartWindow | null;
    const window: ChartWindow =
      windowParam === "7d" || windowParam === "12m" ? windowParam : "6m";
    const walletId = searchParams.get("walletId") || "all";

    const chartData = await getDashboardChartData(session.user.id, {
      window,
      walletId,
    });

    return NextResponse.json({ chartData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load chart data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

