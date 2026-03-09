"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SkillDefinition, AgentRole } from "@/lib/types";
import { AGENT_ROLES } from "@/lib/types";
import { getAgentVisual } from "@/lib/agent-visuals";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES = Object.values(AGENT_ROLES);
const SPRING = { type: "spring" as const, stiffness: 300, damping: 26 };

// ─── Component ────────────────────────────────────────────────────────────────

interface SkillManagerProps {
  skills: SkillDefinition[];
  onChange: (skills: SkillDefinition[]) => void;
  projectPath?: string;
}

export function SkillManager({ skills, onChange, projectPath }: SkillManagerProps) {
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleEnabled = (id: string) => {
    onChange(skills.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const toggleAgent = (skillId: string, role: AgentRole) => {
    onChange(
      skills.map((s) => {
        if (s.id !== skillId) return s;
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

  const handleScan = async () => {
    if (!projectPath) return;
    setScanning(true);
    try {
      const res = await fetch(`/api/skills?projectPath=${encodeURIComponent(projectPath)}`);
      if (res.ok) {
        const data = (await res.json()) as { skills: SkillDefinition[] };
        if (data.skills) {
          const existingIds = new Set(skills.map((s) => s.id));
          const merged = [...skills, ...data.skills.filter((s) => !existingIds.has(s.id))];
          onChange(merged);
        }
      }
    } catch {
      // Scan failed silently
    } finally {
      setScanning(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/skills", { method: "POST", body: formData });
      if (res.ok) {
        const data = (await res.json()) as { skill: SkillDefinition };
        if (data.skill) onChange([...skills, data.skill]);
      }
    } catch {
      // Import failed silently
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-2">
        <motion.button
          onClick={handleScan}
          disabled={scanning || !projectPath}
          className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-text-secondary backdrop-blur-sm transition-colors hover:border-accent/30 hover:text-accent disabled:opacity-40"
          style={{ background: "rgba(10, 11, 16, 0.5)" }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
        >
          <svg className={`h-3.5 w-3.5 ${scanning ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          {scanning ? "Scanning…" : "Scan Project"}
        </motion.button>

        <motion.button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-text-secondary backdrop-blur-sm transition-colors hover:border-status-live/30 hover:text-status-live disabled:opacity-40"
          style={{
            background: "rgba(10, 11, 16, 0.5)",
            boxShadow: "0 0 12px rgba(0, 255, 163, 0.05)",
          }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          {importing ? "Importing…" : "Import .skill"}
        </motion.button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".skill"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Empty state */}
      <AnimatePresence mode="wait">
        {skills.length === 0 ? (
          <motion.div
            key="empty"
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] px-6 py-10 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(0,229,255,0.03) 0%, rgba(176,38,255,0.03) 100%)",
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={SPRING}
          >
            <div className="mb-3 text-2xl opacity-40">🧩</div>
            <p className="mb-1 text-xs font-medium text-text-secondary">No skills detected</p>
            <p className="max-w-xs text-[10px] leading-relaxed text-text-muted">
              Place <span className="font-mono text-agent-explorer/70">.github/skills/</span> folders in your project with a <span className="font-mono text-agent-explorer/70">SKILL.md</span> file, or import a <span className="font-mono text-agent-explorer/70">.skill</span> archive.
            </p>
          </motion.div>
        ) : (
          <motion.div key="list" className="space-y-2" layout>
            {skills.map((skill, idx) => (
              <motion.div
                key={skill.id}
                className="rounded-xl border border-white/[0.06] backdrop-blur-sm"
                style={{
                  background: skill.enabled ? "rgba(20, 21, 31, 0.6)" : "rgba(10, 11, 16, 0.4)",
                  opacity: skill.enabled ? 1 : 0.6,
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: skill.enabled ? 1 : 0.6, y: 0 }}
                transition={{ ...SPRING, delay: idx * 0.03 }}
                whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
                layout
              >
                <div className="flex items-start gap-3 p-3">
                  {/* Toggle */}
                  <motion.button
                    onClick={() => toggleEnabled(skill.id)}
                    className="mt-0.5 shrink-0"
                    aria-label={`Toggle ${skill.name}`}
                    whileTap={{ scale: 0.9 }}
                    transition={SPRING}
                  >
                    <div className={`relative h-5 w-9 rounded-full transition-colors ${skill.enabled ? "bg-accent" : "bg-white/[0.08]"}`}>
                      <motion.div
                        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow"
                        animate={{ x: skill.enabled ? 16 : 2 }}
                        transition={SPRING}
                      />
                    </div>
                  </motion.button>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-primary">{skill.name}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                          skill.source === "local"
                            ? "bg-agent-fixer/10 text-agent-fixer"
                            : "bg-agent-analyst/10 text-agent-analyst"
                        }`}
                      >
                        {skill.source}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-text-muted line-clamp-2">
                      {skill.description}
                    </p>
                    <p className="mt-1 font-mono text-[9px] text-text-muted/60 truncate">
                      {skill.filePath}
                    </p>

                    {/* Agent chips */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ALL_ROLES.map((role) => {
                        const vis = getAgentVisual(role);
                        const assigned = skill.assignedAgents.includes(role);
                        return (
                          <motion.button
                            key={role}
                            onClick={() => toggleAgent(skill.id, role)}
                            className={`rounded-full px-2 py-0.5 text-[9px] font-medium transition-colors ${
                              assigned
                                ? `${vis.bgBadge} ${vis.text} border border-current/20`
                                : "border border-white/[0.06] bg-white/[0.02] text-text-muted hover:text-text-secondary"
                            }`}
                            whileTap={{ scale: 0.92 }}
                            transition={SPRING}
                          >
                            {vis.tag}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
