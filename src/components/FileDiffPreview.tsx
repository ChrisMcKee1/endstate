"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

// ─── Diff parsing ────────────────────────────────────────────────────────────

interface DiffLine {
  type: "add" | "remove" | "context" | "header";
  content: string;
  oldNum: number | null;
  newNum: number | null;
}

function parseDiff(diff: string): { filePath: string; lines: DiffLine[] } {
  const rawLines = diff.split("\n");
  const lines: DiffLine[] = [];
  let filePath = "";
  let oldLine = 0;
  let newLine = 0;

  for (const raw of rawLines) {
    if (raw.startsWith("diff --git") || raw.startsWith("index ")) continue;

    if (raw.startsWith("--- ")) {
      filePath = raw.slice(4).replace(/^a\//, "");
      continue;
    }

    if (raw.startsWith("+++ ")) {
      filePath = raw.slice(4).replace(/^b\//, "");
      continue;
    }

    if (raw.startsWith("@@")) {
      const match = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      lines.push({ type: "header", content: raw, oldNum: null, newNum: null });
      continue;
    }

    if (raw.startsWith("+")) {
      lines.push({ type: "add", content: raw.slice(1), oldNum: null, newNum: newLine++ });
    } else if (raw.startsWith("-")) {
      lines.push({ type: "remove", content: raw.slice(1), oldNum: oldLine++, newNum: null });
    } else {
      lines.push({
        type: "context",
        content: raw.startsWith(" ") ? raw.slice(1) : raw,
        oldNum: oldLine++,
        newNum: newLine++,
      });
    }
  }

  return { filePath, lines };
}

// ─── Line style map ─────────────────────────────────────────────────────────

const LINE_STYLES: Record<DiffLine["type"], { row: string; border: string }> = {
  add: { row: "bg-accent-emerald/[0.08]", border: "border-l-2 border-l-accent-emerald/60" },
  remove: { row: "bg-severity-critical/[0.08]", border: "border-l-2 border-l-severity-critical/60" },
  context: { row: "", border: "border-l-2 border-l-transparent" },
  header: { row: "bg-accent-violet/[0.05]", border: "border-l-2 border-l-accent-violet/30" },
};

const LINE_TEXT_COLOR: Record<DiffLine["type"], string> = {
  add: "text-status-live",
  remove: "text-severity-critical",
  context: "text-text-secondary",
  header: "text-agent-analyst font-semibold",
};

const LINE_PREFIX: Record<DiffLine["type"], string> = {
  add: "+",
  remove: "-",
  context: " ",
  header: "",
};

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

// ─── Component ───────────────────────────────────────────────────────────────

interface FileDiffPreviewProps {
  diff: string;
}

export function FileDiffPreview({ diff }: FileDiffPreviewProps) {
  const { filePath, lines } = useMemo(() => parseDiff(diff), [diff]);

  if (lines.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-xs text-text-muted backdrop-blur-sm">
        No diff data
      </div>
    );
  }

  return (
    <motion.div
      className="overflow-hidden rounded-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-sm bg-surface/50"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
    >
      {/* File header */}
      {filePath && (
        <div className="flex items-center gap-2 border-b border-white/[0.04] px-3 py-2 bg-white/[0.02]">
          <svg
            className="h-3.5 w-3.5 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <span className="font-mono text-[11px] text-text-secondary">
            {filePath}
          </span>
        </div>
      )}

      {/* Diff lines */}
      <div className="max-h-80 overflow-auto">
        <table className="w-full border-collapse font-mono text-[11px] leading-5">
          <tbody>
            {lines.map((line, i) => (
              <tr
                key={i}
                className={`${LINE_STYLES[line.type].row} ${LINE_STYLES[line.type].border} ${LINE_TEXT_COLOR[line.type]}`}
              >
                {/* Old line number */}
                <td className="w-10 select-none px-2 text-right font-mono text-text-muted/20">
                  {line.oldNum ?? ""}
                </td>
                {/* New line number */}
                <td className="w-10 select-none px-2 text-right font-mono text-text-muted/20">
                  {line.newNum ?? ""}
                </td>
                {/* Prefix */}
                <td className="w-4 select-none text-center opacity-50">
                  {LINE_PREFIX[line.type]}
                </td>
                {/* Content */}
                <td className="whitespace-pre-wrap break-all px-2">
                  {line.content}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
