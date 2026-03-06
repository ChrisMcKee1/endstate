import { NextResponse } from "next/server";
import { listModels, getClientState } from "@/lib/copilot/client";

export async function GET() {
  try {
    const models = await listModels();
    return NextResponse.json({ models }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to list models",
        clientState: getClientState(),
      },
      { status: 500 }
    );
  }
}
