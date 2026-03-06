import { NextResponse } from "next/server";
import { getMetricsSnapshot } from "@/lib/otel/metrics";

export async function GET() {
  const snapshot = getMetricsSnapshot();
  return NextResponse.json({ metrics: snapshot }, { status: 200 });
}
