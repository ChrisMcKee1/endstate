"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GitStatus {
  branch: string | null;
  isClean: boolean;
  staged: string[];
  modified: string[];
  not_added: string[];
  deleted: string[];
  renamed: { from: string; to: string }[];
  conflicted: string[];
  ahead: number;
  behind: number;
  tracking: string | null;
}

interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

// ─── Spring Variants (2026 Playbook §4) ──────────────────────────────────────

const SPRING = { type: "spring" as const, stiffness: 400, damping: 28 };

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 24 },
  visible: { opacity: 1, scale: 1, y: 0, transition: SPRING },
  exit: { opacity: 0, scale: 0.96, y: 24, transition: { duration: 0.15 } },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 500, damping: 30 } },
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.03 } },
};

const FILE_TYPE_COLORS = {
  staged: { dot: "bg-agent-fixer", label: "text-agent-fixer", badge: "staged" },
  modified: { dot: "bg-agent-ux", label: "text-agent-ux", badge: "modified" },
  new: { dot: "bg-agent-fixer", label: "text-agent-fixer", badge: "new" },
  deleted: { dot: "bg-severity-critical", label: "text-severity-critical", badge: "deleted" },
} as const;

// ─── Component ───────────────────────────────────────────────────────────────

interface GitPanelProps {
  onClose: () => void;
}

export function GitPanel({ onClose }: GitPanelProps) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [recentCommits, setRecentCommits] = useState<GitCommit[]>([]);
  const [diff, setDiff] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [staging, setStaging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"changes" | "log">("changes");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDiff, setFileDiff] = useState<string | null>(null);
  const [loadingFileDiff, setLoadingFileDiff] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/git?action=status");
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to fetch status");
      const data = await res.json() as GitStatus;
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const fetchLog = useCallback(async () => {
    try {
      const res = await fetch("/api/git?action=log&count=15");
      if (!res.ok) return;
      const data = await res.json() as { commits: GitCommit[] };
      setRecentCommits(data.commits);
    } catch { /* silent */ }
  }, []);

  const fetchDiff = useCallback(async () => {
    try {
      const res = await fetch("/api/git?action=diff");
      if (!res.ok) return;
      const data = await res.json() as { diff: string };
      setDiff(data.diff || null);
    } catch { /* silent */ }
  }, []);

  const fetchFileDiff = useCallback(async (file: string) => {
    setSelectedFile(file);
    setLoadingFileDiff(true);
    setFileDiff(null);
    try {
      const res = await fetch(`/api/git?action=diff&file=${encodeURIComponent(file)}`);
      if (!res.ok) return;
      const data = await res.json() as { diff: string };
      setFileDiff(data.diff || "No changes");
    } catch { /* silent */ }
    finally { setLoadingFileDiff(false); }
  }, []);

  useEffect(() => {
    Promise.all([fetchStatus(), fetchLog(), fetchDiff()]).finally(() =>
      setLoading(false)
    );
  }, [fetchStatus, fetchLog, fetchDiff]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const stageAll = useCallback(async () => {
    setStaging(true);
    setError(null);
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stage-all" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Stage failed");
      await fetchStatus();
      await fetchDiff();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStaging(false);
    }
  }, [fetchStatus, fetchDiff]);

  const stageFiles = useCallback(async (files: string[]) => {
    setStaging(true);
    setError(null);
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stage", files }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Stage failed");
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStaging(false);
    }
  }, [fetchStatus]);

  const commit = useCallback(async () => {
    if (!commitMessage.trim()) return;
    setCommitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", message: commitMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Commit failed");
      setSuccess(`Committed ${data.hash} — ${data.summary.changes} file(s) changed`);
      setCommitMessage("");
      await fetchStatus();
      await fetchLog();
      await fetchDiff();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCommitting(false);
    }
  }, [commitMessage, fetchStatus, fetchLog, fetchDiff]);

  const allUnstaged = [
    ...(status?.modified ?? []),
    ...(status?.not_added ?? []),
    ...(status?.deleted ?? []),
  ];

  const totalChanges = allUnstaged.length + (status?.staged.length ?? 0);

  return (
    <motion.div
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="flex h-[72vh] w-[720px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-border-subtle shadow-elevation-2 bg-surface/[0.92] backdrop-blur-3xl"
        role="dialog"
        aria-modal="true"
        aria-label="Git operations"
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3.5">
          <div className="flex items-center gap-3">
            {/* Git branch icon with cyan glow */}
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-agent-explorer/10">
              <svg className="h-4 w-4 text-agent-explorer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.15em] text-text-primary">
              Git
            </h2>
            {status?.branch && (
              <span className="truncate max-w-[160px] rounded-full bg-agent-explorer/10 px-2.5 py-0.5 font-[family-name:var(--font-code)] text-[10px] text-agent-explorer shadow-[0_0_12px_rgba(0,229,255,0.08)]" title={status.branch}>
                {status.branch}
              </span>
            )}
            {status && !status.isClean && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={SPRING}
                className="rounded-full bg-agent-ux/12 px-2 py-0.5 font-[family-name:var(--font-code)] text-[10px] font-medium text-agent-ux"
              >
                {totalChanges} change{totalChanges !== 1 ? "s" : ""}
              </motion.span>
            )}
            {status?.ahead ? (
              <span className="font-[family-name:var(--font-code)] text-[10px] text-text-muted">↑{status.ahead}</span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle — glassmorphic tabs */}
            <div className="flex rounded-lg border border-border-subtle p-0.5 bg-void/50">
              {(["changes", "log"] as const).map((view) => (
                <motion.button
                  key={view}
                  onClick={() => setActiveView(view)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className={`relative rounded-md px-3.5 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
                    activeView === view
                      ? "text-agent-explorer"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {activeView === view && (
                    <motion.div
                      layoutId="git-tab-indicator"
                      className="absolute inset-0 rounded-md bg-agent-explorer/10"
                      transition={SPRING}
                    />
                  )}
                  <span className="relative z-10">{view}</span>
                </motion.button>
              ))}
            </div>

            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={SPRING}
              aria-label="Close git panel"
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            /* Shimmer skeleton (2026 §6) */
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                className="h-6 w-6 rounded-full border-2 border-transparent border-t-agent-explorer"
                style={{ willChange: "transform" }}
              />
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="text-[10px] uppercase tracking-widest text-text-muted"
              >
                Loading git status
              </motion.span>
            </div>
          ) : error && !status ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING}
              className="flex h-full flex-col items-center justify-center gap-3 text-text-muted"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-severity-critical/10">
                <span className="text-lg text-severity-critical">!</span>
              </div>
              <p className="max-w-xs text-center text-xs text-text-secondary">{error}</p>
            </motion.div>
          ) : activeView === "changes" ? (
            <div className="space-y-5">
              {/* ── Staged files ──────────────────────────────── */}
              <AnimatePresence>
                {status && status.staged.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={SPRING}
                  >
                    <h3 className="mb-2.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-agent-fixer">
                      <span className="h-1.5 w-1.5 rounded-full bg-agent-fixer shadow-[0_0_6px_rgba(0,255,163,0.5)]" />
                      Staged ({status.staged.length})
                    </h3>
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="space-y-0.5"
                    >
                      {status.staged.map((f) => (
                        <motion.div
                          key={`staged-${f}`}
                          variants={listItemVariants}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-white/[0.02]"
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${FILE_TYPE_COLORS.staged.dot}`} />
                          <span className="font-[family-name:var(--font-code)] text-[11px] text-text-secondary">{f}</span>
                          <span className="ml-auto rounded bg-agent-fixer/8 px-1.5 py-0.5 font-[family-name:var(--font-code)] text-[9px] text-agent-fixer/70">
                            staged
                          </span>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Unstaged files ────────────────────────────── */}
              <AnimatePresence>
                {allUnstaged.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={SPRING}
                  >
                    <div className="mb-2.5 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-agent-ux">
                        <span className="h-1.5 w-1.5 rounded-full bg-agent-ux shadow-[0_0_6px_rgba(255,184,0,0.5)]" />
                        Unstaged ({allUnstaged.length})
                      </h3>
                      <motion.button
                        onClick={stageAll}
                        disabled={staging}
                        whileHover={{ scale: 1.06, boxShadow: "0 0 16px rgba(0, 229, 255, 0.15)" }}
                        whileTap={{ scale: 0.94 }}
                        className="rounded-full border border-agent-explorer/20 bg-agent-explorer/8 px-3 py-1 text-[10px] font-medium text-agent-explorer transition-colors hover:bg-agent-explorer/15 disabled:opacity-40"
                      >
                        {staging ? "Staging…" : "Stage All"}
                      </motion.button>
                    </div>
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="space-y-0.5"
                    >
                      {status?.modified.map((f) => (
                        <FileRow key={`mod-${f}`} file={f} type="modified" selected={selectedFile === f} onStage={() => stageFiles([f])} onClick={() => fetchFileDiff(f)} />
                      ))}
                      {status?.not_added.map((f) => (
                        <FileRow key={`new-${f}`} file={f} type="new" selected={selectedFile === f} onStage={() => stageFiles([f])} onClick={() => fetchFileDiff(f)} />
                      ))}
                      {status?.deleted.map((f) => (
                        <FileRow key={`del-${f}`} file={f} type="deleted" selected={selectedFile === f} onStage={() => stageFiles([f])} onClick={() => fetchFileDiff(f)} />
                      ))}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Clean state ───────────────────────────────── */}
              {status?.isClean && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={SPRING}
                  className="flex flex-col items-center justify-center gap-3 py-16"
                >
                  <motion.div
                    animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-agent-fixer/10 shadow-[0_0_24px_rgba(0,255,163,0.12)]"
                  >
                    <svg className="h-6 w-6 text-agent-fixer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                  <p className="text-xs text-text-muted">Working tree is clean</p>
                </motion.div>
              )}

              {/* ── Diff preview (full or per-file) ───────────── */}
              <AnimatePresence mode="wait">
                {selectedFile && (fileDiff || loadingFileDiff) ? (
                  <motion.div
                    key={`file-${selectedFile}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={SPRING}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-agent-explorer">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                        {selectedFile}
                      </h3>
                      <motion.button
                        onClick={() => { setSelectedFile(null); setFileDiff(null); }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="rounded p-1 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </motion.button>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border-subtle bg-void/60">
                      {loadingFileDiff ? (
                        <div className="flex items-center justify-center py-8">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="h-4 w-4 rounded-full border-2 border-transparent border-t-agent-explorer"
                            style={{ willChange: "transform" }}
                          />
                        </div>
                      ) : (
                        <pre className="max-h-80 overflow-auto p-4 font-[family-name:var(--font-code)] text-[10px] leading-relaxed">
                          {renderColoredDiff(fileDiff ?? "")}
                        </pre>
                      )}
                    </div>
                  </motion.div>
                ) : diff ? (
                  <motion.div
                    key="full-diff"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={SPRING}
                  >
                    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                      Diff Preview
                    </h3>
                    <div className="overflow-hidden rounded-xl border border-border-subtle bg-void/60">
                      <pre className="max-h-52 overflow-auto p-4 font-[family-name:var(--font-code)] text-[10px] leading-relaxed">
                        {renderColoredDiff(diff.slice(0, 5000))}
                        {diff.length > 5000 && <span className="text-text-muted">{"\n\n"}… truncated</span>}
                      </pre>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : (
            /* ── Log view ────────────────────────────────────── */
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-1"
            >
              {recentCommits.length === 0 ? (
                <p className="py-12 text-center text-xs text-text-muted">No commits found</p>
              ) : (
                recentCommits.map((c, i) => (
                  <motion.div
                    key={c.hash}
                    variants={listItemVariants}
                    custom={i}
                    className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.02]"
                  >
                    <span className="shrink-0 rounded-md bg-agent-explorer/8 px-2 py-0.5 font-[family-name:var(--font-code)] text-[10px] text-agent-explorer shadow-[0_0_8px_rgba(0,229,255,0.06)]">
                      {c.hash}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-text-primary">{c.message}</p>
                      <p className="font-[family-name:var(--font-code)] text-[10px] text-text-muted">
                        {c.author} · {new Date(c.date).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </div>

        {/* ── Footer — commit form ────────────────────────────── */}
        <AnimatePresence>
          {activeView === "changes" && status && !status.isClean && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={SPRING}
              className="shrink-0 border-t border-border-subtle p-4 bg-surface/50"
            >
              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    key="error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mb-2 text-[11px] text-severity-critical"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
                {success && (
                  <motion.p
                    key="success"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mb-2 text-[11px] text-agent-fixer"
                  >
                    {success}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="flex gap-2">
                <input
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message…"
                  className="flex-1 rounded-xl border border-border-active bg-void/60 px-4 py-2.5 font-[family-name:var(--font-code)] text-xs text-text-primary placeholder:text-text-muted/40 transition-shadow focus:border-agent-explorer/30 focus:shadow-[inset_0_0_20px_rgba(0,229,255,0.04),0_0_16px_rgba(0,229,255,0.06)] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && commitMessage.trim()) {
                      e.preventDefault();
                      commit();
                    }
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: "0 0 20px rgba(0, 255, 163, 0.2)" }}
                  whileTap={{ scale: 0.94 }}
                  onClick={commit}
                  disabled={!commitMessage.trim() || committing || (status?.staged.length ?? 0) === 0}
                  className="rounded-xl bg-agent-fixer/12 px-5 py-2.5 font-[family-name:var(--font-display)] text-[11px] font-semibold uppercase tracking-widest text-agent-fixer transition-colors hover:bg-agent-fixer/20 disabled:opacity-25"
                >
                  {committing ? (
                    <motion.span
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    >
                      Committing…
                    </motion.span>
                  ) : (
                    "Commit"
                  )}
                </motion.button>
              </div>
              {(status?.staged.length ?? 0) === 0 && allUnstaged.length > 0 && (
                <p className="mt-2 text-[10px] text-text-muted">
                  Stage files before committing
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FileRow({ file, type, selected, onStage, onClick }: { file: string; type: keyof typeof FILE_TYPE_COLORS; selected?: boolean; onStage: () => void; onClick?: () => void }) {
  const colors = FILE_TYPE_COLORS[type];
  return (
    <motion.div
      variants={listItemVariants}
      className={`flex w-full items-center gap-1 rounded-lg transition-colors ${
        selected ? "bg-agent-explorer/5 ring-1 ring-agent-explorer/20" : ""
      }`}
    >
      <button
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
        <span className="truncate font-[family-name:var(--font-code)] text-[11px] text-text-secondary">{file}</span>
        <span className={`ml-auto shrink-0 font-[family-name:var(--font-code)] text-[9px] ${colors.label}/60`}>
          {colors.badge}
        </span>
      </button>
      <motion.button
        onClick={(e) => { e.stopPropagation(); onStage(); }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="shrink-0 rounded px-2 py-1 text-[9px] font-medium text-agent-explorer/60 transition-colors hover:bg-agent-explorer/10 hover:text-agent-explorer"
        title="Stage file"
      >
        +stage
      </motion.button>
    </motion.div>
  );
}

// ─── Diff colorizer ──────────────────────────────────────────────────────────

function renderColoredDiff(raw: string): ReactNode {
  if (!raw) return null;
  const lines = raw.split("\n");
  return lines.map((line, i) => {
    let className = "text-text-secondary";
    if (line.startsWith("+") && !line.startsWith("+++")) {
      className = "text-agent-fixer";
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      className = "text-severity-critical";
    } else if (line.startsWith("@@")) {
      className = "text-agent-analyst";
    } else if (line.startsWith("diff ") || line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++")) {
      className = "text-text-muted";
    }
    return (
      <span key={i} className={className}>
        {line}\n
      </span>
    );
  });
}
