import { NextResponse } from "next/server";
import { simpleGit } from "simple-git";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs/promises";
import { getActiveProjectPath } from "@/lib/pipeline/project-resolver";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGit(projectPath: string) {
  return simpleGit(projectPath);
}

async function resolveProjectPath(): Promise<string> {
  const activePath = getActiveProjectPath();
  if (activePath) return activePath;

  // Legacy fallback: root .agentic-dev.json (pre-migration)
  const fs = await import("node:fs");
  const path = await import("node:path");
  const configPath = path.join(process.cwd(), ".agentic-dev.json");
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as { projectPath?: string };
    if (parsed.projectPath) return parsed.projectPath;
  }

  throw new Error("No project path configured");
}

// ─── GET: status, diff, log ──────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "status";

  try {
    const projectPath = await resolveProjectPath();
    const git = getGit(projectPath);

    switch (action) {
      case "status": {
        const status = await git.status();
        return NextResponse.json({
          branch: status.current,
          isClean: status.isClean(),
          staged: status.staged,
          modified: status.modified,
          not_added: status.not_added,
          deleted: status.deleted,
          renamed: status.renamed.map((r) => ({ from: r.from, to: r.to })),
          conflicted: status.conflicted,
          ahead: status.ahead,
          behind: status.behind,
          tracking: status.tracking,
        });
      }

      case "diff": {
        const staged = searchParams.get("staged") === "true";
        const file = searchParams.get("file");
        if (file) {
          // For worktree directories, list changed files inside the worktree
          if (file.includes(".endstate-worktrees/") && file.endsWith("/")) {
            const worktreePath = path.join(projectPath, file);
            try {
              const wtGit = getGit(worktreePath);
              const wtStatus = await wtGit.status();
              const changedFiles = [
                ...wtStatus.modified.map((f) => `M  ${f}`),
                ...wtStatus.not_added.map((f) => `?  ${f}`),
                ...wtStatus.staged.map((f) => `A  ${f}`),
                ...wtStatus.deleted.map((f) => `D  ${f}`),
              ];
              const summary = changedFiles.length > 0
                ? changedFiles.join("\n")
                : "No changes in worktree";
              const wtDiff = await wtGit.diff();
              return NextResponse.json({
                diff: wtDiff || summary,
                file,
                worktree: true,
                changedFiles: changedFiles.length,
              });
            } catch {
              return NextResponse.json({ diff: "Unable to read worktree status", file });
            }
          }
          const diff = staged
            ? await git.diff(["--cached", "--", file])
            : await git.diff(["--", file]);
          // For untracked (new) files, git diff returns empty — show file contents instead
          if (!diff) {
            try {
              const fullPath = path.join(projectPath, file);
              const stat = await fs.stat(fullPath);
              if (stat.isDirectory()) {
                const entries = await fs.readdir(fullPath);
                return NextResponse.json({
                  diff: `New directory with ${entries.length} entries:\n${entries.join("\n")}`,
                  file,
                });
              }
              const content = await fs.readFile(fullPath, "utf-8");
              return NextResponse.json({
                diff: content.length > 10000
                  ? `${content.slice(0, 10000)}\n... (truncated)`
                  : content,
                file,
              });
            } catch {
              return NextResponse.json({ diff: "No changes", file });
            }
          }
          return NextResponse.json({ diff, file });
        }
        const diff = staged
          ? await git.diff(["--cached"])
          : await git.diff();
        return NextResponse.json({ diff });
      }

      case "show": {
        const showFile = searchParams.get("file");
        if (!showFile) {
          return NextResponse.json({ error: "file parameter required" }, { status: 400 });
        }
        try {
          const content = await git.show([`HEAD:${showFile}`]);
          return NextResponse.json({ content, file: showFile });
        } catch {
          return NextResponse.json({ content: null, file: showFile });
        }
      }

      case "log": {
        const count = Math.min(
          parseInt(searchParams.get("count") ?? "20", 10),
          100
        );
        const log = await git.log({ maxCount: count });
        return NextResponse.json({
          commits: log.all.map((c) => ({
            hash: c.hash.slice(0, 8),
            message: c.message,
            author: c.author_name,
            date: c.date,
          })),
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// ─── POST: stage, commit ─────────────────────────────────────────────────────

const StageSchema = z.object({
  action: z.literal("stage"),
  files: z.array(z.string()).min(1),
});

const StageAllSchema = z.object({
  action: z.literal("stage-all"),
});

const CommitSchema = z.object({
  action: z.literal("commit"),
  message: z.string().min(1).max(500),
});

const RequestSchema = z.discriminatedUnion("action", [
  StageSchema,
  StageAllSchema,
  CommitSchema,
]);

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = RequestSchema.parse(body);
    const projectPath = await resolveProjectPath();
    const git = getGit(projectPath);

    switch (parsed.action) {
      case "stage": {
        await git.add(parsed.files);
        const status = await git.status();
        return NextResponse.json({
          staged: status.staged,
          message: `Staged ${parsed.files.length} file(s)`,
        });
      }

      case "stage-all": {
        await git.add("-A");
        const status = await git.status();
        return NextResponse.json({
          staged: status.staged,
          message: "Staged all changes",
        });
      }

      case "commit": {
        const status = await git.status();
        if (status.staged.length === 0) {
          return NextResponse.json(
            { error: "No staged changes to commit" },
            { status: 400 }
          );
        }
        const result = await git.commit(parsed.message);
        return NextResponse.json({
          hash: result.commit,
          branch: result.branch,
          summary: {
            changes: result.summary.changes,
            insertions: result.summary.insertions,
            deletions: result.summary.deletions,
          },
        });
      }
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
