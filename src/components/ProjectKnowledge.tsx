"use client";

import { useState, useEffect, useCallback, useRef, useTransition, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

// ─── Constants (hoisted) ─────────────────────────────────────────────────────

const SPRING = { type: "spring" as const, stiffness: 400, damping: 25 };
const POLL_INTERVAL_MS = 8000;

// ─── Types ───────────────────────────────────────────────────────────────────

interface KnowledgeResponse {
  content: string | null;
  updatedAt: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ProjectKnowledgeProps {
  projectPath: string;
  isRunning: boolean;
}

export function ProjectKnowledge({ projectPath, isRunning }: ProjectKnowledgeProps) {
  const [content, setContent] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // React 19 useTransition for async mutations — gives us isPending for free
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  // AbortController ref for cleaning up in-flight fetches on unmount
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch knowledge base ────────────────────────────────────────────────────

  const fetchKnowledge = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(
        `/api/knowledge?projectPath=${encodeURIComponent(projectPath)}`,
        { signal },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as KnowledgeResponse;
      setContent(data.content);
      setLastUpdated(data.updatedAt);
      setError(null);
    } catch (err) {
      // Don't surface abort errors — they're expected on cleanup
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Couldn\u2019t load project knowledge. Check your connection and try refreshing.");
    }
  }, [projectPath]);

  // Initial fetch + polling while pipeline runs
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    fetchKnowledge(controller.signal);

    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning) {
      interval = setInterval(() => fetchKnowledge(controller.signal), POLL_INTERVAL_MS);
    }

    return () => {
      controller.abort();
      if (interval) clearInterval(interval);
    };
  }, [fetchKnowledge, isRunning]);

  // ── CRUD operations ─────────────────────────────────────────────────────────

  // Callback ref — focuses textarea immediately when React attaches it
  const textareaRefCallback = useCallback((node: HTMLTextAreaElement | null) => {
    if (node) node.focus();
  }, []);

  const startEditing = useCallback(() => {
    setEditContent(content ?? "");
    setIsEditing(true);
    setError(null);
  }, [content]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditContent("");
    setError(null);
  }, []);

  const saveContent = useCallback(() => {
    if (!editContent.trim()) {
      setError("Knowledge content can\u2019t be empty. Write some notes about your project or press Esc to cancel.");
      return;
    }
    startSaveTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editContent, projectPath }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(typeof data.error === "string" ? data.error : "Save failed");
        }
        setContent(editContent);
        setLastUpdated(new Date().toISOString());
        setIsEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn\u2019t save \u2014 try again or check your connection");
      }
    });
  }, [editContent, projectPath]);

  const deleteContent = useCallback(() => {
    startDeleteTransition(async () => {
      setError(null);
      try {
        const res = await fetch(
          `/api/knowledge?projectPath=${encodeURIComponent(projectPath)}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error("Delete failed");
        setContent(null);
        setLastUpdated(null);
        setShowDeleteConfirm(false);
        setIsEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn\u2019t delete \u2014 try again or check your connection");
      }
    });
  }, [projectPath]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelEditing();
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveContent();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isEditing, cancelEditing, saveContent]);

  // ── Derived state ───────────────────────────────────────────────────────────

  const hasContent = content !== null;
  const statusMeta = useMemo(() => {
    if (hasContent) return {
      dot: "bg-status-live shadow-[0_0_8px_rgba(0,255,163,0.4)]",
      label: "Knowledge loaded",
    };
    return {
      dot: "bg-text-muted",
      label: "No research yet",
    };
  }, [hasContent]);

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (!hasContent && !isEditing) {
    return (
      <div className="flex h-full flex-col" role="region" aria-label="Project Knowledge">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
            <span className="text-[10px] uppercase tracking-widest text-text-muted">
              Project Knowledge
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 12px rgba(0, 229, 255, 0.15)" }}
            whileTap={{ scale: 0.95 }}
            transition={SPRING}
            onClick={startEditing}
            className="flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[10px] font-medium text-accent transition-colors hover:bg-accent/20"
            aria-label="Add project knowledge manually"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add
          </motion.button>
        </div>

        {/* Empty body */}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-subtle bg-overlay/50">
            <svg className="h-6 w-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-text-secondary">No project knowledge yet</p>
            <p className="mt-1 max-w-[280px] text-[10px] leading-relaxed text-text-muted">
              {isRunning
                ? "The Researcher agent is analyzing your target project and building a concise overview that all downstream agents use as shared context"
                : "The Researcher will analyze your project’s tech stack, structure, and conventions — creating shared context that saves tokens and keeps every agent aligned"}
            </p>
            {!isRunning && (
              <p className="mt-2 text-[10px] text-text-muted/70">
                Or click <span className="text-accent font-medium">Add</span> above to write your own
              </p>
            )}
          </div>
          {isRunning && (
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="flex items-center gap-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-agent-researcher" />
              <span className="text-[10px] text-agent-researcher">Researcher working...</span>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <div className="flex h-full flex-col" role="region" aria-label="Edit Project Knowledge">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="h-2 w-2 rounded-full bg-severity-medium shadow-[0_0_6px_rgba(234,179,8,0.3)]"
            />
            <span className="text-[10px] uppercase tracking-widest text-severity-medium">
              Editing
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING}
              onClick={cancelEditing}
              className="rounded-full border border-border-active bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:bg-white/[0.06]"
              aria-label="Cancel editing"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 12px rgba(0, 255, 163, 0.2)" }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING}
              onClick={saveContent}
              disabled={isSaving}
              className="flex items-center gap-1 rounded-full border border-status-live/20 bg-status-live/10 px-2.5 py-1 text-[10px] font-medium text-status-live transition-colors hover:bg-status-live/20 disabled:opacity-40"
              aria-label="Save knowledge"
            >
              {isSaving ? (
                <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }}>
                  Saving...
                </motion.span>
              ) : (
                <>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Save
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-4 mt-2 overflow-hidden rounded-lg border border-severity-critical/20 bg-severity-critical/5 px-3 py-1.5 text-[10px] text-severity-critical"
                role="alert"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-2">
            <span className="text-[10px] text-text-muted">Markdown supported</span>
            <div className="h-3 w-px bg-border-subtle" />
            <span className="text-[9px] text-text-muted/50">Ctrl+S to save · Esc to cancel</span>
          </div>
          <textarea
            ref={textareaRefCallback}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="flex-1 resize-none bg-transparent px-4 py-3 font-mono text-xs leading-relaxed text-text-primary outline-none placeholder:text-text-muted/40"
            placeholder={"# Project Knowledge\n\nWrite or paste your project research here...\n\n## Tech Stack\n- Framework: ...\n- Language: ...\n\n## Architecture\n..."}
            spellCheck={false}
            aria-label="Knowledge content editor"
          />
        </div>
      </div>
    );
  }

  // ── View mode ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col" role="region" aria-label="Project Knowledge">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
          <span className="text-[10px] uppercase tracking-widest text-text-muted">
            {statusMeta.label}
          </span>
          {lastUpdated && (
            <span className="text-[9px] text-text-muted/50">
              {new Date(lastUpdated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={SPRING}
            onClick={startEditing}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-accent/10 hover:text-accent"
            title="Edit knowledge"
            aria-label="Edit project knowledge"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={SPRING}
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-severity-critical/10 hover:text-severity-critical"
            title="Delete knowledge"
            aria-label="Delete project knowledge"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={SPRING}
            onClick={() => fetchKnowledge()}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-secondary"
            title="Refresh"
            aria-label="Refresh knowledge"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Markdown content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <MarkdownRenderer content={content!} />
      </div>

      {/* Agent context badge */}
      <div className="flex items-center gap-2 border-t border-border-subtle bg-glass-cyan px-4 py-2">
        <svg className="h-3 w-3 text-accent/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
        <span className="text-[9px] text-accent-dim">
          Injected into all agent system prompts as working context
        </span>
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={SPRING}
              className="glass-panel mx-4 rounded-xl p-5"
            >
              <h3 id="delete-confirm-title" className="text-sm font-semibold text-text-primary">
                Delete project knowledge?
              </h3>
              <p className="mt-1.5 text-xs text-text-secondary">
                This removes research from all agent contexts. The Researcher will need to run again to regenerate it.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={SPRING}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-full border border-border-active bg-white/[0.03] px-3 py-1.5 text-[10px] font-medium text-text-secondary transition-colors hover:bg-white/[0.06]"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 0 12px rgba(239, 68, 68, 0.2)" }}
                  whileTap={{ scale: 0.95 }}
                  transition={SPRING}
                  onClick={deleteContent}
                  disabled={isDeleting}
                  className="rounded-full border border-severity-critical/20 bg-severity-critical/10 px-3 py-1.5 text-[10px] font-medium text-severity-critical transition-colors hover:bg-severity-critical/20 disabled:opacity-40"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
