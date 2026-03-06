import fs from "node:fs";
import path from "node:path";

const PROJECTS_DIR = path.join(process.cwd(), ".projects");
const ACTIVE_FILE = path.join(PROJECTS_DIR, "active.json");

interface ActiveProject {
  projectPath: string;
  slug: string;
}

// ─── Slug derivation ─────────────────────────────────────────────────────────

export function slugify(projectPath: string): string {
  return path
    .basename(projectPath)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Path helpers ────────────────────────────────────────────────────────────

export function projectDir(projectPath: string): string {
  return path.join(PROJECTS_DIR, slugify(projectPath));
}

export function projectConfigPath(projectPath: string): string {
  return path.join(projectDir(projectPath), "config.json");
}

export function projectTasksDir(projectPath: string): string {
  return path.join(projectDir(projectPath), "tasks");
}

export function ensureProjectDir(projectPath: string): void {
  const tasksDir = projectTasksDir(projectPath);
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }
}

// ─── Active project ──────────────────────────────────────────────────────────

export function getActiveProjectPath(): string | null {
  if (!fs.existsSync(ACTIVE_FILE)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(ACTIVE_FILE, "utf-8")) as ActiveProject;
    return raw.projectPath ?? null;
  } catch {
    return null;
  }
}

export function setActiveProject(projectPath: string): void {
  ensureProjectDir(projectPath);
  const data: ActiveProject = { projectPath, slug: slugify(projectPath) };
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
  fs.writeFileSync(ACTIVE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Legacy migration ────────────────────────────────────────────────────────

export function migrateFromLegacy(): boolean {
  const legacyConfig = path.join(process.cwd(), ".agentic-dev.json");
  const legacyTasksDir = path.join(process.cwd(), "data", "tasks");

  if (!fs.existsSync(legacyConfig)) return false;

  let config: { projectPath?: string };
  try {
    config = JSON.parse(fs.readFileSync(legacyConfig, "utf-8"));
  } catch {
    return false;
  }

  if (!config.projectPath) return false;

  const targetConfigPath = projectConfigPath(config.projectPath);

  // Don't re-migrate
  if (fs.existsSync(targetConfigPath)) return false;

  // Create project structure
  ensureProjectDir(config.projectPath);

  // Copy config
  fs.copyFileSync(legacyConfig, targetConfigPath);

  // Copy task files
  if (fs.existsSync(legacyTasksDir)) {
    const targetTasks = projectTasksDir(config.projectPath);
    const files = fs.readdirSync(legacyTasksDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      fs.copyFileSync(
        path.join(legacyTasksDir, file),
        path.join(targetTasks, file),
      );
    }
  }

  // Set as active
  setActiveProject(config.projectPath);

  return true;
}
