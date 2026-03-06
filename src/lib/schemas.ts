import { z } from "zod";
import { SEVERITIES, AGENT_ROLES, REASONING_EFFORTS, SKILL_SOURCES, MCP_SERVER_TYPES, TOOL_TYPES } from "@/lib/types";

// ─── Reusable enums ───────────────────────────────────────────────────────────

const severityEnum = z.enum([
  SEVERITIES.CRITICAL,
  SEVERITIES.HIGH,
  SEVERITIES.MEDIUM,
  SEVERITIES.LOW,
]);

const agentRoleEnum = z.enum([
  AGENT_ROLES.EXPLORER,
  AGENT_ROLES.ANALYST,
  AGENT_ROLES.FIXER,
  AGENT_ROLES.UX_REVIEWER,
]);

const reasoningEffortEnum = z.enum([
  REASONING_EFFORTS.LOW,
  REASONING_EFFORTS.MEDIUM,
  REASONING_EFFORTS.HIGH,
  REASONING_EFFORTS.XHIGH,
]);

// ─── Customization schemas ────────────────────────────────────────────────────

export const SkillDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  filePath: z.string().min(1),
  enabled: z.boolean(),
  assignedAgents: z.array(agentRoleEnum),
  source: z.enum([SKILL_SOURCES.LOCAL, SKILL_SOURCES.IMPORTED]),
});

export const CustomAgentDefinitionSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string(),
  prompt: z.string().min(1),
  enabled: z.boolean(),
});

export const McpServerEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum([MCP_SERVER_TYPES.STDIO, MCP_SERVER_TYPES.HTTP]),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  tools: z.array(z.string()).optional(),
  enabled: z.boolean(),
  assignedAgents: z.array(agentRoleEnum),
});

export const ToolEntrySchema = z.object({
  name: z.string().min(1),
  type: z.enum([TOOL_TYPES.BUILTIN, TOOL_TYPES.CUSTOM]),
  enabled: z.boolean(),
});

// ─── Pipeline config ──────────────────────────────────────────────────────────

export const PipelineConfigSchema = z.object({
  projectPath: z.string().min(1),
  appUrl: z.string().url(),
  inspiration: z.string().min(1),
  maxCycles: z.number().int().min(1).max(50),
  model: z.string().min(1),
  autoApprove: z.boolean(),
  infiniteSessions: z.boolean(),
  fixSeverity: severityEnum,
  enableExplorer: z.boolean(),
  enableAnalyst: z.boolean(),
  enableFixer: z.boolean(),
  enableUxReviewer: z.boolean(),
  reasoningEffort: reasoningEffortEnum.optional(),
  skills: z.array(SkillDefinitionSchema).default([]),
  customAgentDefinitions: z.array(CustomAgentDefinitionSchema).default([]),
  mcpServerOverrides: z.array(McpServerEntrySchema).default([]),
  toolOverrides: z.array(ToolEntrySchema).default([]),
});
