import fs from "node:fs";
import path from "node:path";
import { recordTaskCreated, recordTaskResolved } from "@/lib/otel/metrics";
import type {
  Task,
  TaskCreateInput,
  TaskUpdateInput,
  TaskStatus,
  Severity,
  TaskEvent,
  Domain,
} from "@/lib/types";
import { TASK_STATUSES, TASK_ACTIONS, DOMAINS } from "@/lib/types";
import { projectTasksDir, getActiveProjectPath } from "./project-resolver";

// ─── Per-project state ───────────────────────────────────────────────────────

interface ProjectTaskState {
  tasks: Map<string, Task>;
  counter: number;
  loaded: boolean;
  tasksDir: string;
}

const projectStates = new Map<string, ProjectTaskState>();

function resolveTasksDir(projectPath?: string): string {
  const resolved = projectPath ?? getActiveProjectPath();
  if (!resolved) throw new Error("No active project – set one via settings first");
  return projectTasksDir(resolved);
}

function getState(projectPath?: string): ProjectTaskState {
  const tasksDir = resolveTasksDir(projectPath);

  let state = projectStates.get(tasksDir);
  if (!state) {
    state = { tasks: new Map(), counter: 0, loaded: false, tasksDir };
    projectStates.set(tasksDir, state);
  }
  return state;
}

// ─── Disk I/O ────────────────────────────────────────────────────────────────

function ensureDir(state: ProjectTaskState): void {
  if (!fs.existsSync(state.tasksDir)) {
    fs.mkdirSync(state.tasksDir, { recursive: true });
  }
}

function taskPath(state: ProjectTaskState, id: string): string {
  return path.join(state.tasksDir, `${id}.json`);
}

function writeToDisk(state: ProjectTaskState, task: Task): void {
  ensureDir(state);
  fs.writeFileSync(taskPath(state, task.id), JSON.stringify(task, null, 2), "utf-8");
}

function loadFromDisk(state: ProjectTaskState): void {
  if (state.loaded) return;
  state.loaded = true;

  ensureDir(state);
  const files = fs.readdirSync(state.tasksDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(state.tasksDir, file), "utf-8");
      const task = JSON.parse(raw) as Task;
      // Backfill domains for tasks created before the domains field existed
      if (!task.domains) {
        task.domains = inferDomains(task.component, task.files);
      }
      state.tasks.set(task.id, task);
      // Keep counter in sync
      const num = parseInt(task.id.replace("TSK-", ""), 10);
      if (num >= state.counter) state.counter = num;
    } catch {
      // Skip corrupt files
    }
  }
}

// ─── Domain inference ────────────────────────────────────────────────────────

const DOMAIN_KEYWORDS: Record<Domain, string[]> = {
  [DOMAINS.UI]: ["frontend", "ui", "react", "component", "css", "tailwind", "layout", "page", "view", "form", "button", "modal", "ux", "style", "html", "tsx", "jsx"],
  [DOMAINS.BACKEND]: ["backend", "api", "server", "route", "endpoint", "controller", "middleware", "auth", "handler", "service"],
  [DOMAINS.DATABASE]: ["database", "db", "sql", "query", "schema", "migration", "model", "orm", "prisma", "drizzle", "table"],
  [DOMAINS.DOCS]: ["docs", "documentation", "readme", "changelog", "guide", "tutorial", "comment", "jsdoc", ".md"],
};

function inferDomains(component: string, files?: string[]): Domain[] {
  const text = [component, ...(files ?? [])].join(" ").toLowerCase();
  const matched: Domain[] = [];
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS) as [Domain, string[]][]) {
    if (keywords.some((kw) => text.includes(kw))) {
      matched.push(domain);
    }
  }
  return matched;
}

// ─── ID generation ───────────────────────────────────────────────────────────

function nextId(state: ProjectTaskState): string {
  state.counter++;
  return `TSK-${String(state.counter).padStart(3, "0")}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function createTask(input: TaskCreateInput, projectPath?: string): Task {
  const state = getState(projectPath);
  loadFromDisk(state);

  const now = new Date().toISOString();
  const id = nextId(state);

  const initialEvent: TaskEvent = {
    agent: input.agent,
    action: TASK_ACTIONS.DISCOVERED,
    timestamp: now,
    cycle: input.cycle,
    detail: input.detail,
    expected: input.expected,
    actual: input.actual,
  };

  const task: Task = {
    id,
    title: input.title,
    severity: input.severity,
    status: TASK_STATUSES.OPEN,
    component: input.component,
    cycle: input.cycle,
    files: input.files ?? [],
    tags: input.tags ?? [],
    domains: input.domains?.length ? input.domains : inferDomains(input.component, input.files),
    timeline: [initialEvent],
    createdAt: now,
    updatedAt: now,
  };

  state.tasks.set(id, task);
  writeToDisk(state, task);
  recordTaskCreated();
  return task;
}

export function updateTask(input: TaskUpdateInput, projectPath?: string): Task {
  const state = getState(projectPath);
  loadFromDisk(state);

  const task = state.tasks.get(input.taskId);
  if (!task) throw new Error(`Task ${input.taskId} not found`);

  const now = new Date().toISOString();

  const event: TaskEvent = {
    agent: input.agent,
    action: input.action,
    timestamp: now,
    cycle: input.cycle,
    detail: input.detail,
    expected: input.expected,
    actual: input.actual,
    reasoning: input.reasoning,
    diff: input.diff,
    buildResult: input.buildResult,
    screenshot: input.screenshot,
  };

  task.timeline.push(event);
  task.updatedAt = now;

  if (input.status) {
    task.status = input.status;
    if (input.status === TASK_STATUSES.RESOLVED) {
      task.resolvedAt = now;
      recordTaskResolved();
    }
  }

  if (input.files) {
    const merged = new Set([...task.files, ...input.files]);
    task.files = [...merged];
  }

  if (input.tags) {
    const merged = new Set([...task.tags, ...input.tags]);
    task.tags = [...merged];
  }

  writeToDisk(state, task);
  return task;
}

export function getTask(id: string, projectPath?: string): Task | undefined {
  const state = getState(projectPath);
  loadFromDisk(state);
  return state.tasks.get(id);
}

export function getAllTasks(projectPath?: string): Task[] {
  const state = getState(projectPath);
  loadFromDisk(state);
  return [...state.tasks.values()];
}

export function getTasksByStatus(status: TaskStatus, projectPath?: string): Task[] {
  const state = getState(projectPath);
  loadFromDisk(state);
  return [...state.tasks.values()].filter((t) => t.status === status);
}

export function getTasksBySeverity(severity: Severity, projectPath?: string): Task[] {
  const state = getState(projectPath);
  loadFromDisk(state);
  return [...state.tasks.values()].filter((t) => t.severity === severity);
}

export function getTaskCount(projectPath?: string): number {
  const state = getState(projectPath);
  loadFromDisk(state);
  return state.tasks.size;
}

export function deleteTask(id: string, projectPath?: string): boolean {
  const state = getState(projectPath);
  loadFromDisk(state);
  const task = state.tasks.get(id);
  if (!task) return false;
  state.tasks.delete(id);
  try {
    const fp = taskPath(state, id);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  } catch { /* ignore */ }
  return true;
}

export function deleteTasks(ids: string[], projectPath?: string): number {
  let count = 0;
  for (const id of ids) {
    if (deleteTask(id, projectPath)) count++;
  }
  return count;
}

export function patchTask(id: string, patch: { title?: string; severity?: Severity; status?: TaskStatus; component?: string }, projectPath?: string): Task | null {
  const state = getState(projectPath);
  loadFromDisk(state);
  const task = state.tasks.get(id);
  if (!task) return null;
  if (patch.title !== undefined) task.title = patch.title;
  if (patch.severity !== undefined) task.severity = patch.severity;
  if (patch.status !== undefined) {
    task.status = patch.status;
    if (patch.status === TASK_STATUSES.RESOLVED) task.resolvedAt = new Date().toISOString();
  }
  if (patch.component !== undefined) task.component = patch.component;
  task.updatedAt = new Date().toISOString();
  writeToDisk(state, task);
  return task;
}

export function clearAllTasks(projectPath?: string): number {
  const state = getState(projectPath);
  loadFromDisk(state);
  const count = state.tasks.size;
  for (const [id] of state.tasks) {
    try {
      const fp = taskPath(state, id);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch { /* ignore */ }
  }
  state.tasks.clear();
  state.counter = 0;
  return count;
}
