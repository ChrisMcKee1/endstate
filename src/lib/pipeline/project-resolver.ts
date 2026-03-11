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

export function projectScreenshotsDir(projectPath: string): string {
  return path.join(projectDir(projectPath), "screenshots");
}

export function ensureProjectDir(projectPath: string): void {
  const tasksDir = projectTasksDir(projectPath);
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }
  const screenshotsDir = projectScreenshotsDir(projectPath);
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
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

// ─── Project listing & cleanup ────────────────────────────────────────────────

export interface ProjectInfo {
  slug: string;
  projectPath: string | null;
  taskCount: number;
  configExists: boolean;
  diskSizeBytes: number;
  isActive: boolean;
}

function dirSizeBytes(dir: string): number {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += dirSizeBytes(full);
    } else {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

export function listProjects(): ProjectInfo[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  const activeSlug = (() => {
    try {
      if (!fs.existsSync(ACTIVE_FILE)) return null;
      const raw = JSON.parse(fs.readFileSync(ACTIVE_FILE, "utf-8")) as ActiveProject;
      return raw.slug ?? null;
    } catch {
      return null;
    }
  })();

  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  const projects: ProjectInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const dir = path.join(PROJECTS_DIR, slug);
    const configFile = path.join(dir, "config.json");
    const tasksDir = path.join(dir, "tasks");

    let projectPath: string | null = null;
    if (fs.existsSync(configFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(configFile, "utf-8")) as { projectPath?: string };
        projectPath = raw.projectPath ?? null;
      } catch { /* skip */ }
    }

    let taskCount = 0;
    if (fs.existsSync(tasksDir)) {
      taskCount = fs.readdirSync(tasksDir).filter((f) => f.endsWith(".json")).length;
    }

    projects.push({
      slug,
      projectPath,
      taskCount,
      configExists: fs.existsSync(configFile),
      diskSizeBytes: dirSizeBytes(dir),
      isActive: slug === activeSlug,
    });
  }

  return projects.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function deleteProjectData(slug: string): boolean {
  const dir = path.join(PROJECTS_DIR, slug);
  // Verify slug is a simple name (no path traversal)
  if (slug.includes("/") || slug.includes("\\") || slug.includes("..")) return false;
  if (!fs.existsSync(dir)) return false;

  fs.rmSync(dir, { recursive: true, force: true });

  // If this was the active project, clear active pointer
  try {
    if (fs.existsSync(ACTIVE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(ACTIVE_FILE, "utf-8")) as ActiveProject;
      if (raw.slug === slug) {
        fs.unlinkSync(ACTIVE_FILE);
      }
    }
  } catch { /* ignore */ }

  return true;
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
