import { z } from "zod";
import { SEVERITIES, AGENT_ROLES, REASONING_EFFORTS, SKILL_SOURCES, MCP_SERVER_TYPES, TOOL_TYPES, DOMAINS } from "@/lib/types";

// ─── Reusable enums ───────────────────────────────────────────────────────────

const severityEnum = z.enum([
  SEVERITIES.CRITICAL,
  SEVERITIES.HIGH,
  SEVERITIES.MEDIUM,
  SEVERITIES.LOW,
]);

const agentRoleEnum = z.enum([
  AGENT_ROLES.RESEARCHER,
  AGENT_ROLES.EXPLORER,
  AGENT_ROLES.ANALYST,
  AGENT_ROLES.FIXER,
  AGENT_ROLES.ANALYST_UI,
  AGENT_ROLES.ANALYST_BACKEND,
  AGENT_ROLES.ANALYST_DATABASE,
  AGENT_ROLES.ANALYST_DOCS,
  AGENT_ROLES.FIXER_UI,
  AGENT_ROLES.FIXER_BACKEND,
  AGENT_ROLES.FIXER_DATABASE,
  AGENT_ROLES.FIXER_DOCS,
  AGENT_ROLES.CONSOLIDATOR,
  AGENT_ROLES.UX_REVIEWER,
  AGENT_ROLES.CODE_SIMPLIFIER,
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

const domainEnum = z.enum([
  DOMAINS.UI,
  DOMAINS.BACKEND,
  DOMAINS.DATABASE,
  DOMAINS.DOCS,
]);

// ─── Pipeline config ──────────────────────────────────────────────────────────

const agentGraphNodeSchema = z.object({
  role: agentRoleEnum,
  nodeType: z.enum(["entry", "cycle", "fan-out", "fan-in", "gate", "exit"]),
  runAfter: z.array(agentRoleEnum),
  parallel: z.boolean(),
  enabled: z.boolean(),
  domain: domainEnum.optional(),
  handoffTo: agentRoleEnum.optional(),
  dynamicEnable: z.boolean().optional(),
});

export const PipelineConfigSchema = z.object({
  projectPath: z.string().min(1),
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
  enableResearcher: z.boolean().default(true),
  enableCodeSimplifier: z.boolean().default(true),
  enableConsolidator: z.boolean().default(true),
  enableDomainUI: z.boolean().default(true),
  enableDomainBackend: z.boolean().default(true),
  enableDomainDatabase: z.boolean().default(true),
  enableDomainDocs: z.boolean().default(true),
  enableWorktreeIsolation: z.boolean().default(true),
  agentGraph: z.array(agentGraphNodeSchema).default([]),
  reasoningEffort: reasoningEffortEnum.optional(),
  skills: z.array(SkillDefinitionSchema).default([]),
  customAgentDefinitions: z.array(CustomAgentDefinitionSchema).default([]),
  mcpServerOverrides: z.array(McpServerEntrySchema).default([]),
  toolOverrides: z.array(ToolEntrySchema).default([]),
});
