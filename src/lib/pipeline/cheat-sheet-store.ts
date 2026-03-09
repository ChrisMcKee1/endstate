/**
 * Cheat Sheet Store
 *
 * Stores the Researcher's cheat sheet (project overview, tech stack, architecture)
 * so it can be injected into all downstream agent system prompts.
 * Keyed by project path for multi-project support.
 */

const store = new Map<string, string>();

const CHEAT_SHEET_START = "---CHEAT-SHEET-START---";
const CHEAT_SHEET_END = "---CHEAT-SHEET-END---";

export function setCheatSheet(projectPath: string, content: string): void {
  store.set(projectPath, content);
}

export function getCheatSheet(projectPath: string): string | null {
  return store.get(projectPath) ?? null;
}

export function clearCheatSheet(projectPath: string): void {
  store.delete(projectPath);
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
