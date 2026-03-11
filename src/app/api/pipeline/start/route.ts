import { NextResponse } from "next/server";
import { z } from "zod";
import { startPipeline, getPipelineState } from "@/lib/pipeline/orchestrator";
import { PipelineConfigSchema } from "@/lib/schemas";
import { withApiTiming } from "@/lib/otel/metrics";

export async function POST(request: Request) {
  return withApiTiming("pipeline.start", async () => {
    try {
      const body = await request.json() as Record<string, unknown>;
      const resume = body.resume === true;
      const config = PipelineConfigSchema.parse(body);

      const state = getPipelineState();
      if (state.status === "running") {
        return NextResponse.json(
          { error: "Pipeline is already running" },
          { status: 409 }
        );
      }

      const runId = startPipeline(config, { resume });

      return NextResponse.json({ runId, status: resume ? "resumed" : "started" }, { status: 200 });
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
