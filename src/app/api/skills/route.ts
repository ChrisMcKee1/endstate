import { NextResponse } from "next/server";
import path from "node:path";
import { detectProjectSkills, importSkillFile } from "@/lib/pipeline/skill-manager";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get("projectPath");

  if (!projectPath) {
    return NextResponse.json(
      { error: "projectPath query parameter is required" },
      { status: 400 }
    );
  }

  const skills = detectProjectSkills(projectPath);
  return NextResponse.json({ skills }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const projectPath = formData.get("projectPath");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "file field is required (multipart/form-data)" },
        { status: 400 }
      );
    }

    if (!projectPath || typeof projectPath !== "string") {
      return NextResponse.json(
        { error: "projectPath field is required" },
        { status: 400 }
      );
    }

    const targetDir = path.join(projectPath, ".copilot", "skills", "imported");
    const buffer = Buffer.from(await file.arrayBuffer());
    const skills = await importSkillFile(buffer, targetDir);

    return NextResponse.json(
      { skills, message: `Imported ${skills.length} skill(s)` },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
