import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAwards,
  evaluateAwards,
  addAward,
  buildAwardGeneratorPrompt,
} from "@/lib/pipeline/award-store";
import { getMetricsSnapshot } from "@/lib/otel/metrics";
import { getAllTasks } from "@/lib/pipeline/task-store";
import { getClient } from "@/lib/copilot/client";
import { approveAll } from "@github/copilot-sdk";
import { AWARD_RARITIES, AWARD_SOURCES } from "@/lib/types";
import type { Award, AwardRarity } from "@/lib/types";

const VALID_RARITIES = new Set(Object.values(AWARD_RARITIES));

const aiAwardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  rarity: z.string().refine((v) => VALID_RARITIES.has(v as AwardRarity)),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  trigger: z.string().optional(),
});

/**
 * GET /api/awards — Returns all earned awards, evaluating predefined rules first.
 */
export async function GET() {
  const tasks = getAllTasks();
  const metrics = getMetricsSnapshot();

  // Evaluate predefined awards against current state
  evaluateAwards(tasks, metrics);

  return NextResponse.json({ awards: getAwards() }, { status: 200 });
}

/**
 * POST /api/awards — Trigger AI award generation via Copilot SDK.
 * Uses a lightweight session to analyze the pipeline state and generate creative awards.
 */
export async function POST() {
  const tasks = getAllTasks();
  const metrics = getMetricsSnapshot();

  // First, evaluate predefined awards
  evaluateAwards(tasks, metrics);

  const existingIds = getAwards().map((a) => a.id);

  // If there's no meaningful activity, skip AI generation
  const totalActivity =
    (metrics.cyclesCompleted ?? 0) +
    tasks.length +
    (metrics.buildsPass ?? 0) +
    (metrics.buildsFail ?? 0);

  if (totalActivity === 0) {
    return NextResponse.json(
      { awards: getAwards(), generated: 0 },
      { status: 200 },
    );
  }

  try {
    const client = await getClient();
    const prompt = buildAwardGeneratorPrompt(tasks, metrics, existingIds);

    const session = await client.createSession({
      model: "gpt-4.1-mini",
      streaming: false,
      systemMessage: { mode: "replace", content: prompt },
      onPermissionRequest: approveAll,
    });

    try {
      const response = await session.sendAndWait({
        prompt:
          "Analyze the pipeline data above and generate creative awards. Respond with ONLY a JSON array.",
      });

      const content = response?.data?.content;
      if (typeof content === "string") {
        // Extract JSON array from response — handle optional markdown fences
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {
            return NextResponse.json(
              { awards: getAwards(), generated: 0 },
              { status: 200 },
            );
          }
          if (Array.isArray(parsed)) {
            let generatedCount = 0;
            for (const item of parsed) {
              const result = aiAwardSchema.safeParse(item);
              if (!result.success) continue;
              const data = result.data;

              const award: Award = {
                id: `ai-${data.id}`,
                title: data.title,
                description: data.description,
                icon: data.icon,
                rarity: data.rarity as AwardRarity,
                source: AWARD_SOURCES.AI_GENERATED,
                earnedAt: new Date().toISOString(),
                color: data.color,
                trigger: data.trigger,
              };

              if (addAward(award)) {
                generatedCount++;
              }
            }

            return NextResponse.json(
              { awards: getAwards(), generated: generatedCount },
              { status: 200 },
            );
          }
        }
      }

      // If parsing failed, still return existing awards
      return NextResponse.json(
        { awards: getAwards(), generated: 0 },
        { status: 200 },
      );
    } finally {
      await session.destroy();
    }
  } catch {
    // If SDK is unavailable, return predefined awards only
    return NextResponse.json(
      { awards: getAwards(), generated: 0, aiUnavailable: true },
      { status: 200 },
    );
  }
}
