import { NextResponse } from "next/server";
import { getMetricsSnapshot, withApiTiming } from "@/lib/otel/metrics";

export async function GET() {
  return withApiTiming("metrics.get", async () => {
    const snapshot = getMetricsSnapshot();
    return NextResponse.json({ metrics: snapshot }, { status: 200 });
  });
}
