import fs from "node:fs";
import path from "node:path";
import type {
  Task,
  TaskCreateInput,
  TaskUpdateInput,
  TaskStatus,
  Severity,
  TaskEvent,
} from "@/lib/types";
import { TASK_STATUSES, TASK_ACTIONS } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data", "tasks");
const tasks = new Map<string, Task>();
let counter = 0;
let loaded = false;

// ─── Disk I/O ─────────────────────────────────────────────────────────────────

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function taskPath(id: string): string {
  return path.join(DATA_DIR, `${id}.json`);
}

function writeToDisk(task: Task): void {
  ensureDir();
  fs.writeFileSync(taskPath(task.id), JSON.stringify(task, null, 2), "utf-8");
}

function loadFromDisk(): void {
  if (loaded) return;
  loaded = true;

  ensureDir();
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
      const task = JSON.parse(raw) as Task;
      tasks.set(task.id, task);
      // Keep counter in sync
      const num = parseInt(task.id.replace("TSK-", ""), 10);
      if (num >= counter) counter = num;
    } catch {
      // Skip corrupt files
    }
  }
}

// ─── ID generation ────────────────────────────────────────────────────────────

function nextId(): string {
  counter++;
  return `TSK-${String(counter).padStart(3, "0")}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function createTask(input: TaskCreateInput): Task {
  loadFromDisk();

  const now = new Date().toISOString();
  const id = nextId();

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
    timeline: [initialEvent],
    createdAt: now,
    updatedAt: now,
  };

  tasks.set(id, task);
  writeToDisk(task);
  return task;
}

export function updateTask(input: TaskUpdateInput): Task {
  loadFromDisk();

  const task = tasks.get(input.taskId);
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

  writeToDisk(task);
  return task;
}

export function getTask(id: string): Task | undefined {
  loadFromDisk();
  return tasks.get(id);
}

export function getAllTasks(): Task[] {
  loadFromDisk();
  return [...tasks.values()];
}

export function getTasksByStatus(status: TaskStatus): Task[] {
  loadFromDisk();
  return [...tasks.values()].filter((t) => t.status === status);
}

export function getTasksBySeverity(severity: Severity): Task[] {
  loadFromDisk();
  return [...tasks.values()].filter((t) => t.severity === severity);
}

export function getTaskCount(): number {
  loadFromDisk();
  return tasks.size;
}
