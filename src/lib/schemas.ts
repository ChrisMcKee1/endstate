import { z } from "zod";
import { SEVERITIES } from "@/lib/types";

export const PipelineConfigSchema = z.object({
  projectPath: z.string().min(1),
  appUrl: z.string().url(),
  inspiration: z.string().min(1),
  maxCycles: z.number().int().min(1).max(50),
  model: z.string().min(1),
  autoApprove: z.boolean(),
  infiniteSessions: z.boolean(),
  fixSeverity: z.enum([
    SEVERITIES.CRITICAL,
    SEVERITIES.HIGH,
    SEVERITIES.MEDIUM,
    SEVERITIES.LOW,
  ]),
  enableExplorer: z.boolean(),
  enableAnalyst: z.boolean(),
  enableFixer: z.boolean(),
  enableUxReviewer: z.boolean(),
});
