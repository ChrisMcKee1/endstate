import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getCheatSheet,
  setCheatSheet,
  clearCheatSheet,
} from "@/lib/pipeline/cheat-sheet-store";
import { getActiveProjectPath } from "@/lib/pipeline/project-resolver";

function resolveProjectPath(request: Request): string | null {
  const { searchParams } = new URL(request.url);
  return searchParams.get("projectPath") ?? getActiveProjectPath();
}

// GET — Read current cheat sheet
export async function GET(request: Request) {
  const projectPath = resolveProjectPath(request);
  if (!projectPath) {
    return NextResponse.json(
      { content: null, message: "No active project" },
      { status: 200 },
    );
  }

  const content = getCheatSheet(projectPath);
  return NextResponse.json(
    { content, projectPath, updatedAt: content ? new Date().toISOString() : null },
    { status: 200 },
  );
}

const UpdateSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  projectPath: z.string().optional(),
});

// POST — Create or fully replace cheat sheet
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const { content, projectPath: bodyPath } = UpdateSchema.parse(body);
    const projectPath = bodyPath ?? getActiveProjectPath();
    if (!projectPath) {
      return NextResponse.json({ error: "No active project" }, { status: 400 });
    }

    setCheatSheet(projectPath, content);
    return NextResponse.json(
      { ok: true, projectPath, updatedAt: new Date().toISOString() },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 422 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// PUT — Partial update (same behavior as POST for text content)
export async function PUT(request: Request) {
  return POST(request);
}

// DELETE — Clear cheat sheet
export async function DELETE(request: Request) {
  const projectPath = resolveProjectPath(request);
  if (!projectPath) {
    return NextResponse.json({ error: "No active project" }, { status: 400 });
  }

  clearCheatSheet(projectPath);
  return NextResponse.json({ ok: true, projectPath }, { status: 200 });
}
