import { defineTool } from "@github/copilot-sdk";
import { z } from "zod";
import {
  createTask,
  updateTask,
  getAllTasks,
} from "@/lib/pipeline/task-store";
import { SEVERITIES, TASK_STATUSES, AGENT_ROLES, TASK_ACTIONS, DOMAINS } from "@/lib/types";

const severityEnum = z.enum([
  SEVERITIES.CRITICAL,
  SEVERITIES.HIGH,
  SEVERITIES.MEDIUM,
  SEVERITIES.LOW,
]);

const agentEnum = z.enum([
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

const statusEnum = z.enum([
  TASK_STATUSES.OPEN,
  TASK_STATUSES.IN_PROGRESS,
  TASK_STATUSES.RESOLVED,
  TASK_STATUSES.DEFERRED,
  TASK_STATUSES.WONT_FIX,
]);

const actionEnum = z.enum([
  TASK_ACTIONS.DISCOVERED,
  TASK_ACTIONS.DIAGNOSED,
  TASK_ACTIONS.FIXED,
  TASK_ACTIONS.VERIFIED,
  TASK_ACTIONS.FLAGGED,
  TASK_ACTIONS.DEFERRED,
  TASK_ACTIONS.REGRESSION,
]);

// ─── create_task ──────────────────────────────────────────────────────────────

export const createTaskTool = defineTool("create_task", {
  description:
    "Create a new task to track a finding, bug, or improvement discovered in the target application.",
  parameters: z.object({
    title: z.string().describe("Short, actionable title for the task"),
    severity: severityEnum.describe("Severity level"),
    component: z.string().describe("Application area (Frontend, API, Database, Auth, UX, etc.)"),
    cycle: z.number().describe("Current pipeline cycle number"),
    agent: agentEnum.describe("The agent creating this task"),
    detail: z.string().describe("Detailed description of the finding"),
    expected: z.string().optional().describe("What should have happened"),
    actual: z.string().optional().describe("What actually happened"),
    files: z.array(z.string()).optional().describe("Affected file paths"),
    tags: z.array(z.string()).optional().describe("Free-form tags"),
    domains: z.array(z.enum([DOMAINS.UI, DOMAINS.BACKEND, DOMAINS.DATABASE, DOMAINS.DOCS]))
      .optional()
      .describe("Workstream domains this task touches: ui, backend, database, docs. A task can belong to multiple domains."),
  }),
  handler: async (params, _invocation) => {
    const task = createTask(params);
    return { taskId: task.id, status: task.status };
  },
});

// ─── update_task ──────────────────────────────────────────────────────────────

export const updateTaskTool = defineTool("update_task", {
  description:
    "Update an existing task with a new timeline event (diagnosed, fixed, verified, etc.).",
  parameters: z.object({
    taskId: z.string().describe("Task ID (e.g. TSK-001)"),
    status: statusEnum.optional().describe("New task status"),
    agent: agentEnum.describe("The agent performing this update"),
    action: actionEnum.describe("What action is being recorded"),
    cycle: z.number().describe("Current pipeline cycle number"),
    detail: z.string().describe("Description of what was done"),
    expected: z.string().optional().describe("Expected outcome"),
    actual: z.string().optional().describe("Actual outcome"),
    reasoning: z.string().optional().describe("Agent reasoning for this action"),
    diff: z.string().optional().describe("Code diff for fix actions"),
    buildResult: z
      .enum(["pass", "fail"])
      .optional()
      .describe("Build result after fix"),
    screenshot: z.string().optional().describe("Path to screenshot artifact"),
    files: z.array(z.string()).optional().describe("Additional affected files"),
    tags: z.array(z.string()).optional().describe("Additional tags"),
  }),
  handler: async (params, _invocation) => {
    const task = updateTask(params);
    return { taskId: task.id, status: task.status, timelineLength: task.timeline.length };
  },
});

// ─── list_tasks ───────────────────────────────────────────────────────────────

export const listTasksTool = defineTool("list_tasks", {
  description:
    "List all current tasks with their status and severity. Useful for checking what has already been reported before creating duplicates.",
  parameters: z.object({
    status: statusEnum.optional().describe("Filter by status"),
    severity: severityEnum.optional().describe("Filter by severity"),
  }),
  handler: async (params, _invocation) => {
    let tasks = getAllTasks();
    if (params.status) {
      tasks = tasks.filter((t) => t.status === params.status);
    }
    if (params.severity) {
      tasks = tasks.filter((t) => t.severity === params.severity);
    }
    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      severity: t.severity,
      status: t.status,
      component: t.component,
      cycle: t.cycle,
      files: t.files,
      timelineCount: t.timeline.length,
    }));
  },
});

// ─── check_app_health ─────────────────────────────────────────────────────────

export const checkAppHealthTool = defineTool("check_app_health", {
  description:
    "Check whether the target application is running and responsive at the given URL.",
  parameters: z.object({
    url: z.string().describe("Base URL of the target application"),
  }),
  handler: async ({ url }, _invocation) => {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      return { healthy: resp.ok, status: resp.status, url };
    } catch (err) {
      return {
        healthy: false,
        status: 0,
        url,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

/** All custom tools, bundled for session creation. */
export const agentTools = [
  createTaskTool,
  updateTaskTool,
  listTasksTool,
  checkAppHealthTool,
];
