import { NextResponse } from "next/server";
import {
  getAllTasks,
  getTask,
  getTasksByStatus,
  getTasksBySeverity,
} from "@/lib/pipeline/task-store";
import type { TaskStatus, Severity } from "@/lib/types";
import { TASK_STATUSES, SEVERITIES } from "@/lib/types";

const VALID_STATUSES = new Set(Object.values(TASK_STATUSES));
const VALID_SEVERITIES = new Set(Object.values(SEVERITIES));

export async function GET(request: Request) {
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
}
