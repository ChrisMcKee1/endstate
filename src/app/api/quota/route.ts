import { NextResponse } from "next/server";
import { getAccountQuota, getAuthStatus, getClientState } from "@/lib/copilot/client";

/**
 * GET /api/quota — Returns account quota and auth info from the Copilot SDK.
 * Uses native SDK types (no wrapper DTOs).
 */
export async function GET() {
  try {
    const state = getClientState();
    if (state !== "connected") {
      return NextResponse.json(
        { error: "Copilot client not connected", state },
        { status: 503 },
      );
    }

    const [quota, auth] = await Promise.all([
      getAccountQuota(),
      getAuthStatus(),
    ]);

    return NextResponse.json({ quota, auth });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
