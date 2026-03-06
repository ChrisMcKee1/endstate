"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CustomAgentDefinition } from "@/lib/types";

const SPRING = { type: "spring" as const, stiffness: 300, damping: 26 };

const EMPTY_AGENT: CustomAgentDefinition = {
  name: "",
  displayName: "",
  description: "",
  prompt: "",
  enabled: true,
};

const INPUT_CLASS =
  "w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-text-primary placeholder:text-text-muted/30 backdrop-blur-sm focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20";
const MONO_INPUT_CLASS = `${INPUT_CLASS} font-mono`;

// ─── Component ────────────────────────────────────────────────────────────────

interface CustomAgentManagerProps {
  agents: CustomAgentDefinition[];
  onChange: (agents: CustomAgentDefinition[]) => void;
}

export function CustomAgentManager({ agents, onChange }: CustomAgentManagerProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<CustomAgentDefinition>({ ...EMPTY_AGENT });
  const [editingName, setEditingName] = useState<string | null>(null);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const updateDraft = <K extends keyof CustomAgentDefinition>(key: K, value: CustomAgentDefinition[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleAdd = () => {
    if (!draft.name.trim() || !draft.displayName.trim()) return;
    const safeName = draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    onChange([...agents, { ...draft, name: safeName }]);
    setDraft({ ...EMPTY_AGENT });
    setAdding(false);
  };

  const toggleEnabled = (name: string) => {
    onChange(agents.map((a) => (a.name === name ? { ...a, enabled: !a.enabled } : a)));
  };

  const handleDelete = (name: string) => {
    onChange(agents.filter((a) => a.name !== name));
    setConfirmDelete(null);
  };

  const handleEditSave = (original: string, updated: CustomAgentDefinition) => {
    onChange(agents.map((a) => (a.name === original ? updated : a)));
    setEditingName(null);
  };

  return (
    <div className="space-y-4">
      {/* Add button */}
      <AnimatePresence mode="wait">
        {!adding && (
          <motion.button
            key="add-btn"
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.08] py-2.5 text-[10px] font-medium uppercase tracking-wider text-text-muted transition-colors hover:border-accent/30 hover:text-accent"
            style={{ background: "rgba(10, 11, 16, 0.3)" }}
            whileTap={{ scale: 0.98 }}
            transition={SPRING}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Custom Agent
          </motion.button>
        )}
      </AnimatePresence>

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <motion.div
            className="rounded-xl border border-accent/20 p-4 backdrop-blur-sm"
            style={{ background: "rgba(20, 21, 31, 0.6)", boxShadow: "0 0 20px rgba(0,229,255,0.05)" }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING}
          >
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-accent">
              New Agent
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] text-text-muted">Name (slug)</label>
                  <input type="text" value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} placeholder="perf-auditor" className={MONO_INPUT_CLASS} />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-text-muted">Display Name</label>
                  <input type="text" value={draft.displayName} onChange={(e) => updateDraft("displayName", e.target.value)} placeholder="Performance Auditor" className={INPUT_CLASS} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-text-muted">Description</label>
                <input type="text" value={draft.description} onChange={(e) => updateDraft("description", e.target.value)} placeholder="Analyzes and optimizes runtime performance" className={INPUT_CLASS} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-text-muted">System Prompt</label>
                <textarea value={draft.prompt} onChange={(e) => updateDraft("prompt", e.target.value)} placeholder="You are a performance specialist…" rows={5} className={`${MONO_INPUT_CLASS} resize-none leading-relaxed`} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setAdding(false); setDraft({ ...EMPTY_AGENT }); }} className="rounded-xl px-4 py-1.5 text-[10px] font-medium text-text-muted transition-colors hover:text-text-primary">
                  Cancel
                </button>
                <motion.button
                  onClick={handleAdd}
                  disabled={!draft.name.trim() || !draft.displayName.trim()}
                  className="rounded-xl bg-accent/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-accent transition-colors hover:bg-accent/20 disabled:opacity-30"
                  whileTap={{ scale: 0.96 }}
                  transition={SPRING}
                >
                  Add Agent
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {agents.length === 0 && !adding && (
        <motion.div
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] px-6 py-10 text-center"
          style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.03) 0%, rgba(176,38,255,0.03) 100%)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={SPRING}
        >
          <div className="mb-3 text-2xl opacity-40">🤖</div>
          <p className="mb-1 text-xs font-medium text-text-secondary">No custom agents</p>
          <p className="max-w-xs text-[10px] leading-relaxed text-text-muted">
            Define specialized agent personas beyond the 4 built-in roles.
          </p>
        </motion.div>
      )}

      {/* Agent list */}
      {agents.map((agent, idx) => (
        <motion.div
          key={agent.name}
          className="rounded-xl border border-white/[0.06] backdrop-blur-sm"
          style={{
            background: agent.enabled ? "rgba(20, 21, 31, 0.6)" : "rgba(10, 11, 16, 0.4)",
            opacity: agent.enabled ? 1 : 0.6,
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: agent.enabled ? 1 : 0.6, y: 0 }}
          transition={{ ...SPRING, delay: idx * 0.03 }}
          whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
          layout
        >
          {editingName === agent.name ? (
            <AgentEditForm
              agent={agent}
              onSave={(updated) => handleEditSave(agent.name, updated)}
              onCancel={() => setEditingName(null)}
            />
          ) : (
            <div className="p-3">
              <div className="flex items-start gap-3">
                {/* Toggle */}
                <motion.button onClick={() => toggleEnabled(agent.name)} className="mt-0.5 shrink-0" aria-label={`Toggle ${agent.displayName}`} whileTap={{ scale: 0.9 }} transition={SPRING}>
                  <div className={`relative h-5 w-9 rounded-full transition-colors ${agent.enabled ? "bg-accent" : "bg-white/[0.08]"}`}>
                    <motion.div className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow" animate={{ x: agent.enabled ? 16 : 2 }} transition={SPRING} />
                  </div>
                </motion.button>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-primary">{agent.displayName}</span>
                    <span className="font-mono text-[9px] text-text-muted">{agent.name}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-text-muted">{agent.description}</p>

                  {/* Prompt preview */}
                  {agent.prompt && (
                    <button
                      onClick={() => setExpandedPrompt(expandedPrompt === agent.name ? null : agent.name)}
                      className="mt-1.5 flex items-center gap-1 text-[9px] text-agent-analyst transition-colors hover:text-agent-analyst/80"
                    >
                      <motion.svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        animate={{ rotate: expandedPrompt === agent.name ? 90 : 0 }}
                        transition={SPRING}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </motion.svg>
                      {expandedPrompt === agent.name ? "Hide prompt" : "Show prompt"}
                    </button>
                  )}
                  <AnimatePresence>
                    {expandedPrompt === agent.name && (
                      <motion.pre
                        className="mt-2 max-h-40 overflow-auto rounded-xl border border-white/[0.04] p-3 font-mono text-[10px] leading-relaxed text-text-secondary"
                        style={{ background: "rgba(10, 11, 16, 0.5)" }}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={SPRING}
                      >
                        {agent.prompt}
                      </motion.pre>
                    )}
                  </AnimatePresence>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setEditingName(agent.name)} className="rounded-lg p-1 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary" aria-label="Edit">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                    </svg>
                  </button>
                  <AnimatePresence mode="wait">
                    {confirmDelete === agent.name ? (
                      <motion.div
                        key="confirm"
                        className="flex items-center gap-1"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={SPRING}
                      >
                        <button onClick={() => handleDelete(agent.name)} className="rounded-lg bg-severity-critical/20 px-2 py-0.5 text-[9px] font-bold text-severity-critical">
                          Delete
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="rounded-lg px-2 py-0.5 text-[9px] text-text-muted hover:text-text-primary">
                          Cancel
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="delete-btn"
                        onClick={() => setConfirmDelete(agent.name)}
                        className="rounded-lg p-1 text-text-muted transition-colors hover:bg-severity-critical/10 hover:text-severity-critical"
                        aria-label="Delete"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={SPRING}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Inline Edit Form ────────────────────────────────────────────────────────

function AgentEditForm({
  agent,
  onSave,
  onCancel,
}: {
  agent: CustomAgentDefinition;
  onSave: (a: CustomAgentDefinition) => void;
  onCancel: () => void;
}) {
  const [local, setLocal] = useState<CustomAgentDefinition>({ ...agent });

  return (
    <motion.div
      className="space-y-3 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={SPRING}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] text-text-muted">Display Name</label>
          <input type="text" value={local.displayName} onChange={(e) => setLocal({ ...local, displayName: e.target.value })} className={INPUT_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-text-muted">Description</label>
          <input type="text" value={local.description} onChange={(e) => setLocal({ ...local, description: e.target.value })} className={INPUT_CLASS} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] text-text-muted">System Prompt</label>
        <textarea value={local.prompt} onChange={(e) => setLocal({ ...local, prompt: e.target.value })} rows={5} className={`${INPUT_CLASS} resize-none font-mono leading-relaxed`} />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-xl px-4 py-1.5 text-[10px] text-text-muted hover:text-text-primary">Cancel</button>
        <motion.button onClick={() => onSave(local)} className="rounded-xl bg-accent/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-accent hover:bg-accent/20" whileTap={{ scale: 0.96 }} transition={SPRING}>
          Save
        </motion.button>
      </div>
    </motion.div>
  );
}
