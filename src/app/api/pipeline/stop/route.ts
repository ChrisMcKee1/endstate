import { NextResponse } from "next/server";
import { stopPipeline, getPipelineState } from "@/lib/pipeline/orchestrator";

export async function POST() {
  const state = getPipelineState();
  if (state.status !== "running") {
    return NextResponse.json(
      { error: "Pipeline is not running" },
      { status: 409 }
    );
  }

  stopPipeline();

  return NextResponse.json({ status: "stopped" }, { status: 200 });
}
