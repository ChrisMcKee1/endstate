"use client";

import { useState } from "react";
import type { CustomAgentDefinition } from "@/lib/types";

// ─── Component ────────────────────────────────────────────────────────────────

interface CustomAgentManagerProps {
  agents: CustomAgentDefinition[];
  onChange: (agents: CustomAgentDefinition[]) => void;
}

const EMPTY_AGENT: CustomAgentDefinition = {
  name: "",
  displayName: "",
  description: "",
  prompt: "",
  enabled: true,
};

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
    // Generate a safe name slug
    const safeName = draft.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
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
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-active bg-void/30 py-2.5 text-[10px] font-medium uppercase tracking-wider text-text-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Custom Agent
        </button>
      )}

      {/* Add form */}
      {adding && (
        <div className="rounded-lg border border-accent/30 bg-elevated/60 p-4 animate-fade-in">
          <h3 className="mb-3 font-[family-name:var(--font-display)] text-[10px] font-bold uppercase tracking-widest text-accent">
            New Agent
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] text-text-muted">Name (slug)</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => updateDraft("name", e.target.value)}
                  placeholder="perf-auditor"
                  className="w-full rounded-lg border border-border-subtle bg-void/50 px-3 py-2 font-[family-name:var(--font-code)] text-xs text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-text-muted">Display Name</label>
                <input
                  type="text"
                  value={draft.displayName}
                  onChange={(e) => updateDraft("displayName", e.target.value)}
                  placeholder="Performance Auditor"
                  className="w-full rounded-lg border border-border-subtle bg-void/50 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-text-muted">Description</label>
              <input
                type="text"
                value={draft.description}
                onChange={(e) => updateDraft("description", e.target.value)}
                placeholder="Analyzes and optimizes runtime performance"
                className="w-full rounded-lg border border-border-subtle bg-void/50 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-text-muted">System Prompt</label>
              <textarea
                value={draft.prompt}
                onChange={(e) => updateDraft("prompt", e.target.value)}
                placeholder="You are a performance specialist. Your job is to..."
                rows={5}
                className="w-full resize-none rounded-lg border border-border-subtle bg-void/50 px-3 py-2 font-[family-name:var(--font-code)] text-xs leading-relaxed text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setAdding(false); setDraft({ ...EMPTY_AGENT }); }}
                className="rounded-lg px-4 py-1.5 text-[10px] font-medium text-text-muted transition-colors hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!draft.name.trim() || !draft.displayName.trim()}
                className="rounded-lg bg-accent/10 px-4 py-1.5 font-[family-name:var(--font-display)] text-[10px] font-bold uppercase tracking-wider text-accent transition-colors hover:bg-accent/20 disabled:opacity-30"
              >
                Add Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent list */}
      {agents.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-active bg-void/30 px-6 py-10 text-center">
          <div className="mb-3 text-2xl opacity-40">🤖</div>
          <p className="mb-1 text-xs font-medium text-text-secondary">No custom agents</p>
          <p className="max-w-xs text-[10px] leading-relaxed text-text-muted">
            Define specialized agent personas beyond the 4 built-in roles (Explorer, Analyst, Fixer, UX Reviewer).
          </p>
        </div>
      )}

      {agents.map((agent) => (
        <div
          key={agent.name}
          className={`rounded-lg border transition-colors ${
            agent.enabled ? "border-border-active bg-elevated/60" : "border-border-subtle bg-void/30 opacity-60"
          }`}
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
                <button onClick={() => toggleEnabled(agent.name)} className="mt-0.5 shrink-0" aria-label={`Toggle ${agent.displayName}`}>
                  <div className={`relative h-5 w-9 rounded-full transition-colors ${agent.enabled ? "bg-accent" : "bg-border-active"}`}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${agent.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                </button>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-primary">{agent.displayName}</span>
                    <span className="font-[family-name:var(--font-code)] text-[9px] text-text-muted">{agent.name}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-text-muted">{agent.description}</p>

                  {/* Prompt preview */}
                  {agent.prompt && (
                    <button
                      onClick={() => setExpandedPrompt(expandedPrompt === agent.name ? null : agent.name)}
                      className="mt-1.5 flex items-center gap-1 text-[9px] text-agent-analyst transition-colors hover:text-agent-analyst/80"
                    >
                      <svg className={`h-3 w-3 transition-transform ${expandedPrompt === agent.name ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                      {expandedPrompt === agent.name ? "Hide prompt" : "Show prompt"}
                    </button>
                  )}
                  {expandedPrompt === agent.name && (
                    <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-border-subtle bg-void/50 p-3 font-[family-name:var(--font-code)] text-[10px] leading-relaxed text-text-secondary">
                      {agent.prompt}
                    </pre>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setEditingName(agent.name)}
                    className="rounded p-1 text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
                    aria-label="Edit"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                    </svg>
                  </button>
                  {confirmDelete === agent.name ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(agent.name)}
                        className="rounded bg-severity-critical/20 px-2 py-0.5 text-[9px] font-bold text-severity-critical"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="rounded px-2 py-0.5 text-[9px] text-text-muted hover:text-text-primary"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(agent.name)}
                      className="rounded p-1 text-text-muted transition-colors hover:bg-severity-critical/10 hover:text-severity-critical"
                      aria-label="Delete"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
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
    <div className="space-y-3 p-4 animate-fade-in">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] text-text-muted">Display Name</label>
          <input
            type="text"
            value={local.displayName}
            onChange={(e) => setLocal({ ...local, displayName: e.target.value })}
            className="w-full rounded-lg border border-border-subtle bg-void/50 px-3 py-2 text-xs text-text-primary focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-text-muted">Description</label>
          <input
            type="text"
            value={local.description}
            onChange={(e) => setLocal({ ...local, description: e.target.value })}
            className="w-full rounded-lg border border-border-subtle bg-void/50 px-3 py-2 text-xs text-text-primary focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] text-text-muted">System Prompt</label>
        <textarea
          value={local.prompt}
          onChange={(e) => setLocal({ ...local, prompt: e.target.value })}
          rows={5}
          className="w-full resize-none rounded-lg border border-border-subtle bg-void/50 px-3 py-2 font-[family-name:var(--font-code)] text-xs leading-relaxed text-text-primary focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg px-4 py-1.5 text-[10px] text-text-muted hover:text-text-primary">
          Cancel
        </button>
        <button
          onClick={() => onSave(local)}
          className="rounded-lg bg-accent/10 px-4 py-1.5 font-[family-name:var(--font-display)] text-[10px] font-bold uppercase tracking-wider text-accent hover:bg-accent/20"
        >
          Save
        </button>
      </div>
    </div>
  );
}
