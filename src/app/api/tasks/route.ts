import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAllTasks,
  getTask,
  getTasksByStatus,
  getTasksBySeverity,
  createTask,
  deleteTasks,
  patchTask,
} from "@/lib/pipeline/task-store";
import type { TaskStatus, Severity } from "@/lib/types";
import { TASK_STATUSES, SEVERITIES, AGENT_ROLES } from "@/lib/types";
import { withApiTiming } from "@/lib/otel/metrics";

const VALID_STATUSES = new Set(Object.values(TASK_STATUSES));
const VALID_SEVERITIES = new Set(Object.values(SEVERITIES));

export async function GET(request: Request) {
  return withApiTiming("tasks.get", async () => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");

    // Single task by ID
    if (id) {
      const task = getTask(id);
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      return NextResponse.json({ task }, { status: 200 });
    }

    // Filter by status
    if (status) {
      if (!VALID_STATUSES.has(status as TaskStatus)) {
        return NextResponse.json(
          { error: `Invalid status: ${status}` },
          { status: 400 }
        );
      }
      const tasks = getTasksByStatus(status as TaskStatus);
      return NextResponse.json({ tasks }, { status: 200 });
    }

    // Filter by severity
    if (severity) {
      if (!VALID_SEVERITIES.has(severity as Severity)) {
        return NextResponse.json(
          { error: `Invalid severity: ${severity}` },
          { status: 400 }
        );
      }
      const tasks = getTasksBySeverity(severity as Severity);
      return NextResponse.json({ tasks }, { status: 200 });
    }

    // All tasks
    const tasks = getAllTasks();
    return NextResponse.json({ tasks }, { status: 200 });
  });
}

// ─── POST: create a task manually ────────────────────────────────────────────

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  severity: z.enum([SEVERITIES.CRITICAL, SEVERITIES.HIGH, SEVERITIES.MEDIUM, SEVERITIES.LOW]),
  component: z.string().min(1),
  detail: z.string().min(1),
});

export async function POST(request: Request) {
  return withApiTiming("tasks.create", async () => {
    try {
      const body: unknown = await request.json();
      const data = CreateTaskSchema.parse(body);
      const task = createTask({
        ...data,
        cycle: 0,
        agent: AGENT_ROLES.EXPLORER, // manual tasks attributed to explorer
      });
      return NextResponse.json({ task }, { status: 201 });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
      }
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
  });
}

// ─── PATCH: update a task ────────────────────────────────────────────────────

const PatchTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  severity: z.enum([SEVERITIES.CRITICAL, SEVERITIES.HIGH, SEVERITIES.MEDIUM, SEVERITIES.LOW]).optional(),
  status: z.enum([TASK_STATUSES.OPEN, TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.RESOLVED, TASK_STATUSES.DEFERRED, TASK_STATUSES.WONT_FIX]).optional(),
  component: z.string().min(1).optional(),
});

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json();
    const { id, ...patch } = PatchTaskSchema.parse(body);
    const task = patchTask(id, patch);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ task }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// ─── DELETE: delete tasks ────────────────────────────────────────────────────

const DeleteTaskSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export async function DELETE(request: Request) {
  try {
    const body: unknown = await request.json();
    const { ids } = DeleteTaskSchema.parse(body);
    const count = deleteTasks(ids);
    return NextResponse.json({ deleted: count }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
