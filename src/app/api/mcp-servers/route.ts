import { NextResponse } from "next/server";
import { detectProjectMcpServers } from "@/lib/pipeline/mcp-manager";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get("projectPath");

  if (!projectPath) {
    return NextResponse.json(
      { error: "projectPath query parameter is required" },
      { status: 400 }
    );
  }

  const servers = detectProjectMcpServers(projectPath);
  return NextResponse.json({ servers }, { status: 200 });
}
