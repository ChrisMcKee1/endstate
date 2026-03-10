import { NextResponse } from "next/server";
import { z } from "zod";
import { startPipeline, getPipelineState } from "@/lib/pipeline/orchestrator";
import { PipelineConfigSchema } from "@/lib/schemas";
import { withApiTiming } from "@/lib/otel/metrics";

export async function POST(request: Request) {
  return withApiTiming("pipeline.start", async () => {
    try {
      const body: unknown = await request.json();
      const config = PipelineConfigSchema.parse(body);

      const state = getPipelineState();
      if (state.status === "running") {
        return NextResponse.json(
          { error: "Pipeline is already running" },
          { status: 409 }
        );
      }

      const runId = startPipeline(config);

      return NextResponse.json({ runId, status: "started" }, { status: 200 });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid config", details: err.issues },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Unknown error" },
        { status: 500 }
      );
    }
  });
}
