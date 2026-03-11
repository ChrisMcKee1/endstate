import { NextResponse } from "next/server";
import { listBuiltInTools, getClientState } from "@/lib/copilot/client";

/**
 * GET /api/tools?model=<modelId> — Returns built-in tools available in the Copilot SDK.
 * Uses native SDK types (no wrapper DTOs).
 */
export async function GET(request: Request) {
  try {
    const state = getClientState();
    if (state !== "connected") {
      return NextResponse.json(
        { error: "Copilot client not connected", state },
        { status: 503 },
      );
    }

    const url = new URL(request.url);
    const model = url.searchParams.get("model") ?? undefined;

    const result = await listBuiltInTools(model);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
