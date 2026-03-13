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
import fsPromises from "fs/promises";

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
  const worktreePath = info?.path ?? path.join(projectPath, WORKTREE_DIR, domain);

  try {
    await execAsync(`git worktree remove "${worktreePath}" --force`, {
      cwd: projectPath,
    });
  } catch {
    // git worktree remove failed (locked files on Windows) — force-remove the directory
    try {
      await fsPromises.rm(worktreePath, { recursive: true, force: true });
      // Prune stale worktree entries from git
      await execAsync("git worktree prune", { cwd: projectPath });
    } catch {
      // Directory may already be gone
    }
  }

  if (info) {
    try {
      await execAsync(`git branch -D "${info.branch}"`, {
        cwd: projectPath,
      });
    } catch {
      // Branch may not exist
    }
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
  // 1. Clean up any worktrees tracked in memory
  const toRemove: string[] = [];
  for (const [key, info] of activeWorktrees) {
    if (key.startsWith(`${projectPath}::`)) {
      toRemove.push(info.domain);
    }
  }
  await Promise.all(toRemove.map((domain) => removeWorktree(projectPath, domain)));

  // 2. Scan disk for orphaned worktree directories (handles missed in-memory cleanup)
  const worktreeRoot = path.join(projectPath, WORKTREE_DIR);
  try {
    const entries = await fsPromises.readdir(worktreeRoot);
    for (const entry of entries) {
      const entryPath = path.join(worktreeRoot, entry);
      const stat = await fsPromises.stat(entryPath).catch(() => null);
      if (stat?.isDirectory()) {
        try {
          await execAsync(`git worktree remove "${entryPath}" --force`, { cwd: projectPath });
        } catch {
          await fsPromises.rm(entryPath, { recursive: true, force: true }).catch(() => {});
        }
      }
    }
    // Prune any stale worktree metadata
    await execAsync("git worktree prune", { cwd: projectPath }).catch(() => {});
    // Remove the parent directory if empty
    const remaining = await fsPromises.readdir(worktreeRoot).catch(() => []);
    if (remaining.length === 0) {
      await fsPromises.rmdir(worktreeRoot).catch(() => {});
    }
  } catch {
    // .endstate-worktrees directory may not exist
  }
}

export { WORKTREE_DIR };
