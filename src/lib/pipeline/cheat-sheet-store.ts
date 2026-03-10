/**
 * Cheat Sheet Store
 *
 * Stores the Researcher's cheat sheet (project overview, tech stack, architecture)
 * so it can be injected into all downstream agent system prompts.
 * Keyed by project path for multi-project support.
 * Persists to .projects/<slug>/cheat-sheet.md on disk.
 */

import fs from "node:fs";
import path from "node:path";
import { projectDir, ensureProjectDir } from "@/lib/pipeline/project-resolver";

const store = new Map<string, string>();

const CHEAT_SHEET_START = "---CHEAT-SHEET-START---";
const CHEAT_SHEET_END = "---CHEAT-SHEET-END---";
const CHEAT_SHEET_FILENAME = "cheat-sheet.md";

function cheatSheetPath(projectPath: string): string {
  return path.join(projectDir(projectPath), CHEAT_SHEET_FILENAME);
}

export function setCheatSheet(projectPath: string, content: string): void {
  store.set(projectPath, content);
  // Persist to disk
  try {
    ensureProjectDir(projectPath);
    fs.writeFileSync(cheatSheetPath(projectPath), content, "utf-8");
  } catch { /* best effort — in-memory is primary */ }
}

export function getCheatSheet(projectPath: string): string | null {
  // Check in-memory first
  const cached = store.get(projectPath);
  if (cached) return cached;
  // Fall back to disk
  try {
    const fp = cheatSheetPath(projectPath);
    if (fs.existsSync(fp)) {
      const content = fs.readFileSync(fp, "utf-8");
      store.set(projectPath, content);
      return content;
    }
  } catch { /* fall through */ }
  return null;
}

export function clearCheatSheet(projectPath: string): void {
  store.delete(projectPath);
  try {
    const fp = cheatSheetPath(projectPath);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  } catch { /* best effort */ }
}

/**
 * Parse delimited cheat sheet content from the Researcher's response.
 * Looks for content between ---CHEAT-SHEET-START--- and ---CHEAT-SHEET-END--- markers.
 */
export function parseCheatSheet(response: string): string | null {
  const startIdx = response.indexOf(CHEAT_SHEET_START);
  const endIdx = response.indexOf(CHEAT_SHEET_END);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null;
  return response
    .slice(startIdx + CHEAT_SHEET_START.length, endIdx)
    .trim();
}

export { CHEAT_SHEET_START, CHEAT_SHEET_END };
