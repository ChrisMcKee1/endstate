/**
 * Worktree Manager
 *
 * Manages git worktrees for domain-scoped fixers.
 * Each fixer gets an isolated worktree so parallel agents don't conflict.
 * Worktrees are created under .endstate-worktrees/ in the project root.
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

const WORKTREE_DIR = ".endstate-worktrees";

interface WorktreeInfo {
  path: string;
  branch: string;
  domain: string;
  cycle: number;
}

const activeWorktrees = new Map<string, WorktreeInfo>();

function worktreeKey(projectPath: string, domain: string): string {
  return `${projectPath}::${domain}`;
}

function worktreeBasePath(projectPath: string): string {
  return path.join(projectPath, WORKTREE_DIR);
}

export async function createWorktree(
  projectPath: string,
  domain: string,
  cycle: number,
): Promise<string> {
  const key = worktreeKey(projectPath, domain);
  const existing = activeWorktrees.get(key);
  if (existing) {
    return existing.path;
  }

  const base = worktreeBasePath(projectPath);
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }

  const branch = `endstate/${domain}-cycle-${cycle}`;
  const wtPath = path.join(base, domain);

  await execAsync(`git worktree add -b "${branch}" "${wtPath}" HEAD`, {
    cwd: projectPath,
  });

  const info: WorktreeInfo = { path: wtPath, branch, domain, cycle };
  activeWorktrees.set(key, info);

  return wtPath;
}

export async function mergeWorktree(
  projectPath: string,
  domain: string,
): Promise<{ merged: boolean; conflicts: boolean }> {
  const key = worktreeKey(projectPath, domain);
  const info = activeWorktrees.get(key);
  if (!info) {
    return { merged: false, conflicts: false };
  }

  try {
    // Check if the worktree branch has any changes
    const { stdout: diffOutput } = await execAsync(
      `git diff HEAD --stat`,
      { cwd: info.path },
    );

    if (!diffOutput.trim()) {
      // No changes to merge
      await removeWorktree(projectPath, domain);
      return { merged: false, conflicts: false };
    }

    // Commit any uncommitted changes in the worktree
    await execAsync(`git add -A && git commit -m "endstate: ${domain} cycle ${info.cycle} fixes"`, {
      cwd: info.path,
    }).catch(() => {
      // No changes to commit
    });

    // Merge the worktree branch into the main branch
    const { stderr } = await execAsync(`git merge "${info.branch}" --no-edit`, {
      cwd: projectPath,
    });

    const conflicts = stderr.includes("CONFLICT");
    await removeWorktree(projectPath, domain);

    return { merged: true, conflicts };
  } catch {
    // Merge conflict or other git error
    return { merged: false, conflicts: true };
  }
}

export async function removeWorktree(
  projectPath: string,
  domain: string,
): Promise<void> {
  const key = worktreeKey(projectPath, domain);
  const info = activeWorktrees.get(key);
  if (!info) return;

  try {
    await execAsync(`git worktree remove "${info.path}" --force`, {
      cwd: projectPath,
    });
  } catch {
    // Best effort cleanup
  }

  try {
    await execAsync(`git branch -D "${info.branch}"`, {
      cwd: projectPath,
    });
  } catch {
    // Branch may not exist
  }

  activeWorktrees.delete(key);
}

export function getWorktreePath(
  projectPath: string,
  domain: string,
): string | null {
  const key = worktreeKey(projectPath, domain);
  return activeWorktrees.get(key)?.path ?? null;
}

export async function cleanupAllWorktrees(projectPath: string): Promise<void> {
  const toRemove: string[] = [];
  for (const [key, info] of activeWorktrees) {
    if (key.startsWith(`${projectPath}::`)) {
      toRemove.push(info.domain);
    }
  }

  await Promise.all(toRemove.map((domain) => removeWorktree(projectPath, domain)));
}

export { WORKTREE_DIR };
