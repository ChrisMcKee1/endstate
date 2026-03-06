import { NextResponse } from "next/server";
import { z } from "zod";
import { enqueue } from "@/lib/pipeline/steering";

const SteerSchema = z.object({
  message: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const { message } = SteerSchema.parse(body);

    const entry = enqueue(message);

    return NextResponse.json(
      { id: entry.id, status: "queued", timestamp: entry.timestamp },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
