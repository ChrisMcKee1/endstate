"use client";

import { useState } from "react";
import type { McpServerEntry, AgentRole, McpServerType } from "@/lib/types";
import { AGENT_ROLES, MCP_SERVER_TYPES } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_COLOR_MAP: Record<AgentRole, { bg: string; text: string; label: string }> = {
  [AGENT_ROLES.EXPLORER]: { bg: "bg-agent-explorer/20", text: "text-agent-explorer", label: "Explorer" },
  [AGENT_ROLES.ANALYST]: { bg: "bg-agent-analyst/20", text: "text-agent-analyst", label: "Analyst" },
  [AGENT_ROLES.FIXER]: { bg: "bg-agent-fixer/20", text: "text-agent-fixer", label: "Fixer" },
  [AGENT_ROLES.UX_REVIEWER]: { bg: "bg-agent-ux/20", text: "text-agent-ux", label: "UX" },
};

const ALL_ROLES = Object.values(AGENT_ROLES);

const DEFAULT_SERVERS = new Set(["playwright", "filesystem", "github"]);

const EMPTY_SERVER: McpServerEntry = {
  id: "",
  name: "",
  type: MCP_SERVER_TYPES.STDIO,
  command: "",
  args: [],
  url: "",
  env: {},
  headers: {},
  tools: [],
  enabled: true,
  assignedAgents: [],
};

// ─── Component ────────────────────────────────────────────────────────────────

interface McpServerManagerProps {
  servers: McpServerEntry[];
  onChange: (servers: McpServerEntry[]) => void;
  projectPath?: string;
}

export function McpServerManager({ servers, onChange, projectPath }: McpServerManagerProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<McpServerEntry>({ ...EMPTY_SERVER });
  const [detecting, setDetecting] = useState(false);
  const [envPairs, setEnvPairs] = useState<Array<{ key: string; value: string }>>([]);
  const [toolFilter, setToolFilter] = useState("");

  const toggleEnabled = (id: string) => {
    onChange(servers.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const toggleAgent = (serverId: string, role: AgentRole) => {
    onChange(
      servers.map((s) => {
        if (s.id !== serverId) return s;
        const has = s.assignedAgents.includes(role);
        return {
          ...s,
          assignedAgents: has
            ? s.assignedAgents.filter((r) => r !== role)
            : [...s.assignedAgents, role],
        };
      }),
    );
  };

  const handleDetect = async () => {
    if (!projectPath) return;
    setDetecting(true);
    try {
      const res = await fetch(`/api/mcp-servers?projectPath=${encodeURIComponent(projectPath)}`);
      if (res.ok) {
        const data = (await res.json()) as { servers: McpServerEntry[] };
        if (data.servers) {
          const existingIds = new Set(servers.map((s) => s.id));
          const merged = [...servers, ...data.servers.filter((s) => !existingIds.has(s.id))];
          onChange(merged);
        }
      }
    } catch {
      // Detection failed silently
    } finally {
      setDetecting(false);
    }
  };

  const handleAdd = () => {
    if (!draft.name.trim()) return;
    const id = draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const env = Object.fromEntries(envPairs.filter((p) => p.key.trim()).map((p) => [p.key, p.value]));
    const tools = toolFilter.trim() ? (toolFilter.trim() === "*" ? [] : toolFilter.split(",").map((t) => t.trim()).filter(Boolean)) : [];
    onChange([...servers, { ...draft, id, env, tools }]);
    setDraft({ ...EMPTY_SERVER });
    setEnvPairs([]);
    setToolFilter("");
    setAdding(false);
  };

  const removeServer = (id: string) => {
    onChange(servers.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleDetect}
          disabled={detecting || !projectPath}
          className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-void/50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-text-secondary transition-colors hover:border-accent/30 hover:text-accent disabled:opacity-40"
        >
          <svg className={`h-3.5 w-3.5 ${detecting ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          {detecting ? "Detecting…" : "Detect Servers"}
        </button>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-void/50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-text-secondary transition-colors hover:border-accent/30 hover:text-accent"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Server
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-lg border border-accent/30 bg-elevated/60 p-4 animate-fade-in">
          <h3 className="mb-3 font-[family-name:var(--font-display)] text-[10px] font-bold uppercase tracking-widest text-accent">
            New MCP Server
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] text-text-muted">Name</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="my-server"
                  className="w-full rounded-lg border border-border-subtle bg-void/50 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-text-muted">Type</label>
                <div className="flex gap-1.5">
                  {([MCP_SERVER_TYPES.STDIO, MCP_SERVER_TYPES.HTTP] as McpServerType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setDraft({ ...draft, type: t })}
                      className={`flex-1 rounded-lg border py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                        draft.type === t
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border-subtle bg-void/50 text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* STDIO fields */}
            {draft.type === MCP_SERVER_TYPES.STDIO && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] text-text-muted">Command</label>
                  <input
                    type="text"
                    value={draft.command ?? ""}
                    onChange={(e) => setDraft({ ...draft, command: e.target.value })}
                    placeholder="npx"
                    className="w-full rounded-lg border border-border-subtle bg-void/50 px-3 py-2 font-[family-name:var(--font-code)] text-xs text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-text-muted">Args (comma-separated)</label>
                  <input
                    type="text"
                    value={(draft.args ?? []).join(", ")}
                    onChange={(e) => setDraft({ ...draft, args: e.target.value.split(",").map((a) => a.trim()).filter(Boolean) })}
                    placeholder="@playwright/mcp, --headless"
                    className="w-full rounded-lg border border-border-subtle bg-void/50 px-3 py-2 font-[family-name:var(--font-code)] text-xs text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                  />
                </div>
              </div>
            )}

            {/* HTTP fields */}
            {draft.type === MCP_SERVER_TYPES.HTTP && (
              <div>
                <label className="mb-1 block text-[10px] text-text-muted">URL</label>
                <input
                  type="text"
                  value={draft.url ?? ""}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                  placeholder="http://localhost:8080/mcp"
                  className="w-full rounded-lg border border-border-subtle bg-void/50 px-3 py-2 font-[family-name:var(--font-code)] text-xs text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                />
              </div>
            )}

            {/* Env vars */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[10px] text-text-muted">Environment Variables</label>
                <button
                  onClick={() => setEnvPairs([...envPairs, { key: "", value: "" }])}
                  className="text-[9px] text-accent hover:text-accent/80"
                >
                  + Add
                </button>
              </div>
              {envPairs.map((pair, i) => (
                <div key={i} className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={pair.key}
                    onChange={(e) => { const next = [...envPairs]; next[i] = { ...pair, key: e.target.value }; setEnvPairs(next); }}
                    placeholder="KEY"
                    className="w-1/3 rounded border border-border-subtle bg-void/50 px-2 py-1 font-[family-name:var(--font-code)] text-[10px] text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={pair.value}
                    onChange={(e) => { const next = [...envPairs]; next[i] = { ...pair, value: e.target.value }; setEnvPairs(next); }}
                    placeholder="value"
                    className="flex-1 rounded border border-border-subtle bg-void/50 px-2 py-1 font-[family-name:var(--font-code)] text-[10px] text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none"
                  />
                  <button
                    onClick={() => setEnvPairs(envPairs.filter((_, j) => j !== i))}
                    className="text-text-muted hover:text-severity-critical"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Tool filter */}
            <div>
              <label className="mb-1 block text-[10px] text-text-muted">Tool Filter (comma-separated, or * for all)</label>
              <input
                type="text"
                value={toolFilter}
                onChange={(e) => setToolFilter(e.target.value)}
                placeholder="* (all tools)"
                className="w-full rounded-lg border border-border-subtle bg-void/50 px-3 py-2 font-[family-name:var(--font-code)] text-xs text-text-primary placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
              />
            </div>

            {/* Agent assignment */}
            <div>
              <label className="mb-1.5 block text-[10px] text-text-muted">Assign to Agents</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_ROLES.map((role) => {
                  const meta = AGENT_COLOR_MAP[role];
                  const assigned = draft.assignedAgents.includes(role);
                  return (
                    <button
                      key={role}
                      onClick={() => setDraft({
                        ...draft,
                        assignedAgents: assigned
                          ? draft.assignedAgents.filter((r) => r !== role)
                          : [...draft.assignedAgents, role],
                      })}
                      className={`rounded px-2.5 py-1 text-[10px] font-medium transition-colors ${
                        assigned
                          ? `${meta.bg} ${meta.text} border border-current/20`
                          : "border border-border-subtle bg-void/40 text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setAdding(false); setDraft({ ...EMPTY_SERVER }); setEnvPairs([]); setToolFilter(""); }}
                className="rounded-lg px-4 py-1.5 text-[10px] text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!draft.name.trim()}
                className="rounded-lg bg-accent/10 px-4 py-1.5 font-[family-name:var(--font-display)] text-[10px] font-bold uppercase tracking-wider text-accent hover:bg-accent/20 disabled:opacity-30"
              >
                Add Server
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Server list */}
      {servers.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-active bg-void/30 px-6 py-10 text-center">
          <div className="mb-3 text-2xl opacity-40">🔌</div>
          <p className="mb-1 text-xs font-medium text-text-secondary">No MCP servers configured</p>
          <p className="max-w-xs text-[10px] leading-relaxed text-text-muted">
            Detect servers from your project&apos;s <span className="font-[family-name:var(--font-code)] text-agent-explorer/70">.vscode/mcp.json</span> or add them manually.
          </p>
        </div>
      )}

      {servers.map((server) => (
        <div
          key={server.id}
          className={`rounded-lg border transition-colors ${
            server.enabled ? "border-border-active bg-elevated/60" : "border-border-subtle bg-void/30 opacity-60"
          }`}
        >
          <div className="flex items-start gap-3 p-3">
            {/* Toggle */}
            <button onClick={() => toggleEnabled(server.id)} className="mt-0.5 shrink-0" aria-label={`Toggle ${server.name}`}>
              <div className={`relative h-5 w-9 rounded-full transition-colors ${server.enabled ? "bg-accent" : "bg-border-active"}`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${server.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </button>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-primary">{server.name}</span>

                {/* Badges */}
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                  server.type === MCP_SERVER_TYPES.STDIO
                    ? "bg-agent-fixer/10 text-agent-fixer"
                    : "bg-agent-explorer/10 text-agent-explorer"
                }`}>
                  {server.type}
                </span>
                {DEFAULT_SERVERS.has(server.id) && (
                  <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-accent">
                    Default
                  </span>
                )}

                {/* Status dot */}
                <span className={`h-1.5 w-1.5 rounded-full ${server.enabled ? "bg-status-live" : "bg-status-idle"}`} />
              </div>

              {/* Connection detail */}
              <p className="mt-0.5 font-[family-name:var(--font-code)] text-[9px] text-text-muted/60 truncate">
                {server.type === MCP_SERVER_TYPES.STDIO
                  ? `${server.command ?? ""} ${(server.args ?? []).join(" ")}`
                  : server.url ?? ""}
              </p>

              {/* Tool filter */}
              {server.tools && server.tools.length > 0 && (
                <p className="mt-1 text-[9px] text-text-muted">
                  Tools: <span className="font-[family-name:var(--font-code)] text-text-secondary">{server.tools.join(", ")}</span>
                </p>
              )}

              {/* Agent assignment */}
              <div className="mt-2 flex flex-wrap gap-1">
                {ALL_ROLES.map((role) => {
                  const meta = AGENT_COLOR_MAP[role];
                  const assigned = server.assignedAgents.includes(role);
                  return (
                    <button
                      key={role}
                      onClick={() => toggleAgent(server.id, role)}
                      className={`rounded px-2 py-0.5 text-[9px] font-medium transition-colors ${
                        assigned
                          ? `${meta.bg} ${meta.text} border border-current/20`
                          : "border border-border-subtle bg-void/40 text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Remove (only non-defaults) */}
            {!DEFAULT_SERVERS.has(server.id) && (
              <button
                onClick={() => removeServer(server.id)}
                className="shrink-0 rounded p-1 text-text-muted transition-colors hover:bg-severity-critical/10 hover:text-severity-critical"
                aria-label="Remove server"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
