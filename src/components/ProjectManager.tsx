"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProjectInfo } from "@/lib/pipeline/project-resolver";

const SPRING = { type: "spring" as const, stiffness: 300, damping: 26 };

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function ProjectManager() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = (await res.json()) as { projects: ProjectInfo[] };
        setProjects(data.projects);
      }
    } catch {
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (slug: string) => {
    setDeleting(slug);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.slug !== slug));
        setConfirmSlug(null);
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to delete");
      }
    } catch {
      setError("Network error");
    } finally {
      setDeleting(null);
    }
  };

  const totalSize = projects.reduce((sum, p) => sum + p.diskSizeBytes, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-text-muted/30 border-t-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="glass-panel flex items-center justify-between rounded-xl px-4 py-3">
        <div>
          <p className="text-xs font-medium text-text-primary">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
          <p className="text-[10px] text-text-muted">
            {formatBytes(totalSize)} total disk usage in .projects/
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING}
          onClick={() => { setLoading(true); fetchProjects(); }}
          className="rounded-lg border border-border-subtle bg-void/50 px-3 py-1.5 text-[10px] uppercase tracking-widest text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
        >
          Refresh
        </motion.button>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-severity-critical/20 bg-severity-critical/5 px-3 py-2 text-xs text-severity-critical"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-xs text-text-muted">No projects found</p>
        </div>
      )}

      {/* Project list */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {projects.map((project) => (
            <motion.div
              key={project.slug}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={SPRING}
              className={`glass-panel rounded-xl border px-4 py-3 ${
                project.isActive
                  ? "border-accent/20"
                  : "border-border-subtle"
              }`}
              style={
                project.isActive
                  ? { boxShadow: "inset 3px 0 0 rgba(0,229,255,0.4)" }
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-mono text-xs font-medium text-text-primary">
                      {project.slug}
                    </p>
                    {project.isActive && (
                      <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                        Active
                      </span>
                    )}
                  </div>
                  {project.projectPath && (
                    <p className="mt-0.5 truncate text-[10px] text-text-muted" title={project.projectPath}>
                      {project.projectPath}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-text-muted">
                    <span>{project.taskCount} task{project.taskCount !== 1 ? "s" : ""}</span>
                    <span className="text-border-subtle">·</span>
                    <span>{formatBytes(project.diskSizeBytes)}</span>
                    {!project.configExists && (
                      <>
                        <span className="text-border-subtle">·</span>
                        <span className="text-severity-medium">no config</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete actions */}
                <div className="flex shrink-0 items-center gap-1">
                  {confirmSlug === project.slug ? (
                    <>
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={SPRING}
                        onClick={() => handleDelete(project.slug)}
                        disabled={deleting === project.slug}
                        className="rounded-lg border border-severity-critical/30 bg-severity-critical/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-severity-critical transition-colors hover:bg-severity-critical/20 disabled:opacity-50"
                      >
                        {deleting === project.slug ? (
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border border-severity-critical/30 border-t-severity-critical" />
                        ) : (
                          "Confirm"
                        )}
                      </motion.button>
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={SPRING}
                        onClick={() => setConfirmSlug(null)}
                        className="rounded-lg border border-border-subtle bg-void/50 px-2.5 py-1 text-[10px] uppercase tracking-wider text-text-muted transition-colors hover:text-text-primary"
                      >
                        Cancel
                      </motion.button>
                    </>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      transition={SPRING}
                      onClick={() => setConfirmSlug(project.slug)}
                      disabled={project.isActive}
                      className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-severity-critical/10 hover:text-severity-critical disabled:cursor-not-allowed disabled:opacity-30"
                      title={project.isActive ? "Cannot delete active project" : `Delete ${project.slug}`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Tip */}
      {projects.length > 0 && (
        <p className="text-[10px] italic text-text-muted/50">
          The active project cannot be deleted. Switch to a different project first.
        </p>
      )}
    </div>
  );
}
