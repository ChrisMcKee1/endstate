import { NextResponse } from "next/server";
import { z } from "zod";
import { listProjects, deleteProjectData } from "@/lib/pipeline/project-resolver";

export async function GET() {
  const projects = listProjects();
  return NextResponse.json({ projects }, { status: 200 });
}

const DeleteSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Invalid slug format"),
});

export async function DELETE(request: Request) {
  try {
    const body: unknown = await request.json();
    const { slug } = DeleteSchema.parse(body);

    const deleted = deleteProjectData(slug);

    if (!deleted) {
      return NextResponse.json(
        { error: `Project "${slug}" not found` },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: `Project "${slug}" deleted`, slug },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: err.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
