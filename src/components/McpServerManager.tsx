"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
const SPRING = { type: "spring" as const, stiffness: 300, damping: 26 };

const INPUT_CLASS =
  "w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-text-primary placeholder:text-text-muted/30 backdrop-blur-sm focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20";
const MONO_INPUT_CLASS = `${INPUT_CLASS} font-mono`;

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
        <motion.button
          onClick={handleDetect}
          disabled={detecting || !projectPath}
          className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-text-secondary backdrop-blur-sm transition-colors hover:border-accent/30 hover:text-accent disabled:opacity-40"
          style={{ background: "rgba(10, 11, 16, 0.5)" }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
        >
          <svg className={`h-3.5 w-3.5 ${detecting ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          {detecting ? "Detecting…" : "Detect Servers"}
        </motion.button>
        <AnimatePresence>
          {!adding && (
            <motion.button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-text-secondary backdrop-blur-sm transition-colors hover:border-accent/30 hover:text-accent"
              style={{ background: "rgba(10, 11, 16, 0.5)" }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Server
            </motion.button>
          )}
        </AnimatePresence>
      </div>

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
              New MCP Server
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] text-text-muted">Name</label>
                  <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="my-server" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-text-muted">Type</label>
                  <div className="flex gap-1.5">
                    {([MCP_SERVER_TYPES.STDIO, MCP_SERVER_TYPES.HTTP] as McpServerType[]).map((t) => (
                      <motion.button
                        key={t}
                        onClick={() => setDraft({ ...draft, type: t })}
                        className={`relative flex-1 overflow-hidden rounded-xl border py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                          draft.type === t
                            ? "border-accent/30 text-accent"
                            : "border-white/[0.06] text-text-muted hover:text-text-secondary"
                        }`}
                        style={{ background: draft.type === t ? "rgba(0,229,255,0.08)" : "rgba(10, 11, 16, 0.5)" }}
                        whileTap={{ scale: 0.97 }}
                        transition={SPRING}
                      >
                        {t}
                        {draft.type === t && (
                          <motion.div
                            className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
                            layoutId="type-indicator"
                            transition={SPRING}
                          />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              {/* STDIO fields */}
              <AnimatePresence mode="wait">
                {draft.type === MCP_SERVER_TYPES.STDIO && (
                  <motion.div key="stdio" className="grid grid-cols-2 gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={SPRING}>
                    <div>
                      <label className="mb-1 block text-[10px] text-text-muted">Command</label>
                      <input type="text" value={draft.command ?? ""} onChange={(e) => setDraft({ ...draft, command: e.target.value })} placeholder="npx" className={MONO_INPUT_CLASS} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-text-muted">Args (comma-separated)</label>
                      <input type="text" value={(draft.args ?? []).join(", ")} onChange={(e) => setDraft({ ...draft, args: e.target.value.split(",").map((a) => a.trim()).filter(Boolean) })} placeholder="@playwright/mcp, --headless" className={MONO_INPUT_CLASS} />
                    </div>
                  </motion.div>
                )}
                {draft.type === MCP_SERVER_TYPES.HTTP && (
                  <motion.div key="http" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={SPRING}>
                    <label className="mb-1 block text-[10px] text-text-muted">URL</label>
                    <input type="text" value={draft.url ?? ""} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="http://localhost:8080/mcp" className={MONO_INPUT_CLASS} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Env vars */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[10px] text-text-muted">Environment Variables</label>
                  <button onClick={() => setEnvPairs([...envPairs, { key: "", value: "" }])} className="text-[9px] text-accent hover:text-accent/80">+ Add</button>
                </div>
                {envPairs.map((pair, i) => (
                  <div key={i} className="mt-1 flex gap-2">
                    <input type="text" value={pair.key} onChange={(e) => { const next = [...envPairs]; next[i] = { ...pair, key: e.target.value }; setEnvPairs(next); }} placeholder="KEY" className={`w-1/3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1 font-mono text-[10px] text-text-primary placeholder:text-text-muted/30 focus:border-accent/40 focus:outline-none`} />
                    <input type="text" value={pair.value} onChange={(e) => { const next = [...envPairs]; next[i] = { ...pair, value: e.target.value }; setEnvPairs(next); }} placeholder="value" className={`flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1 font-mono text-[10px] text-text-primary placeholder:text-text-muted/30 focus:border-accent/40 focus:outline-none`} />
                    <button onClick={() => setEnvPairs(envPairs.filter((_, j) => j !== i))} className="text-text-muted hover:text-severity-critical">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Tool filter */}
              <div>
                <label className="mb-1 block text-[10px] text-text-muted">Tool Filter (comma-separated, or * for all)</label>
                <input type="text" value={toolFilter} onChange={(e) => setToolFilter(e.target.value)} placeholder="* (all tools)" className={MONO_INPUT_CLASS} />
              </div>

              {/* Agent assignment */}
              <div>
                <label className="mb-1.5 block text-[10px] text-text-muted">Assign to Agents</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ROLES.map((role) => {
                    const meta = AGENT_COLOR_MAP[role];
                    const assigned = draft.assignedAgents.includes(role);
                    return (
                      <motion.button
                        key={role}
                        onClick={() => setDraft({
                          ...draft,
                          assignedAgents: assigned
                            ? draft.assignedAgents.filter((r) => r !== role)
                            : [...draft.assignedAgents, role],
                        })}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                          assigned
                            ? `${meta.bg} ${meta.text} border border-current/20`
                            : "border border-white/[0.06] bg-white/[0.02] text-text-muted hover:text-text-secondary"
                        }`}
                        whileTap={{ scale: 0.92 }}
                        transition={SPRING}
                      >
                        {meta.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => { setAdding(false); setDraft({ ...EMPTY_SERVER }); setEnvPairs([]); setToolFilter(""); }} className="rounded-xl px-4 py-1.5 text-[10px] text-text-muted hover:text-text-primary">
                  Cancel
                </button>
                <motion.button
                  onClick={handleAdd}
                  disabled={!draft.name.trim()}
                  className="rounded-xl bg-accent/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-accent hover:bg-accent/20 disabled:opacity-30"
                  whileTap={{ scale: 0.96 }}
                  transition={SPRING}
                >
                  Add Server
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {servers.length === 0 && !adding && (
        <motion.div
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] px-6 py-10 text-center"
          style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.03) 0%, rgba(176,38,255,0.03) 100%)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={SPRING}
        >
          <div className="mb-3 text-2xl opacity-40">🔌</div>
          <p className="mb-1 text-xs font-medium text-text-secondary">No MCP servers configured</p>
          <p className="max-w-xs text-[10px] leading-relaxed text-text-muted">
            Detect servers from your project&apos;s <span className="font-mono text-agent-explorer/70">.vscode/mcp.json</span> or add them manually.
          </p>
        </motion.div>
      )}

      {/* Server list */}
      {servers.map((server, idx) => (
        <motion.div
          key={server.id}
          className="rounded-xl border border-white/[0.06] backdrop-blur-sm"
          style={{
            background: server.enabled ? "rgba(20, 21, 31, 0.6)" : "rgba(10, 11, 16, 0.4)",
            opacity: server.enabled ? 1 : 0.6,
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: server.enabled ? 1 : 0.6, y: 0 }}
          transition={{ ...SPRING, delay: idx * 0.03 }}
          whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
          layout
        >
          <div className="flex items-start gap-3 p-3">
            {/* Toggle */}
            <motion.button onClick={() => toggleEnabled(server.id)} className="mt-0.5 shrink-0" aria-label={`Toggle ${server.name}`} whileTap={{ scale: 0.9 }} transition={SPRING}>
              <div className={`relative h-5 w-9 rounded-full transition-colors ${server.enabled ? "bg-accent" : "bg-white/[0.08]"}`}>
                <motion.div className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow" animate={{ x: server.enabled ? 16 : 2 }} transition={SPRING} />
              </div>
            </motion.button>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-primary">{server.name}</span>

                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                  server.type === MCP_SERVER_TYPES.STDIO
                    ? "bg-agent-fixer/10 text-agent-fixer"
                    : "bg-agent-explorer/10 text-agent-explorer"
                }`}>
                  {server.type}
                </span>
                {DEFAULT_SERVERS.has(server.id) && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-accent"
                    style={{ background: "rgba(0,229,255,0.1)", boxShadow: "0 0 8px rgba(0,229,255,0.1)" }}
                  >
                    Default
                  </span>
                )}

                {/* Status dot with glow */}
                <span
                  className={`h-1.5 w-1.5 rounded-full ${server.enabled ? "bg-status-live" : "bg-status-idle"}`}
                  style={server.enabled ? { boxShadow: "0 0 6px rgba(0,255,163,0.4)" } : undefined}
                />
              </div>

              <p className="mt-0.5 font-mono text-[9px] text-text-muted/60 truncate">
                {server.type === MCP_SERVER_TYPES.STDIO
                  ? `${server.command ?? ""} ${(server.args ?? []).join(" ")}`
                  : server.url ?? ""}
              </p>

              {server.tools && server.tools.length > 0 && (
                <p className="mt-1 text-[9px] text-text-muted">
                  Tools: <span className="font-mono text-text-secondary">{server.tools.join(", ")}</span>
                </p>
              )}

              {/* Agent chips */}
              <div className="mt-2 flex flex-wrap gap-1">
                {ALL_ROLES.map((role) => {
                  const meta = AGENT_COLOR_MAP[role];
                  const assigned = server.assignedAgents.includes(role);
                  return (
                    <motion.button
                      key={role}
                      onClick={() => toggleAgent(server.id, role)}
                      className={`rounded-full px-2 py-0.5 text-[9px] font-medium transition-colors ${
                        assigned
                          ? `${meta.bg} ${meta.text} border border-current/20`
                          : "border border-white/[0.06] bg-white/[0.02] text-text-muted hover:text-text-secondary"
                      }`}
                      whileTap={{ scale: 0.92 }}
                      transition={SPRING}
                    >
                      {meta.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Remove (non-defaults only) */}
            {!DEFAULT_SERVERS.has(server.id) && (
              <button
                onClick={() => removeServer(server.id)}
                className="shrink-0 rounded-lg p-1 text-text-muted transition-colors hover:bg-severity-critical/10 hover:text-severity-critical"
                aria-label="Remove server"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
