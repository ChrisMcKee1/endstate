"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

// ─── Remark plugins (hoisted — never re-allocated) ──────────────────────────

const REMARK_PLUGINS = [remarkGfm];

// ─── Custom component overrides for Endstate design system ───────────────────
// Hoisted to module scope so React never sees a new components object.

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-4 text-sm font-bold text-text-primary first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-3 text-xs font-bold uppercase tracking-wider text-text-primary first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-2 text-xs font-semibold text-text-secondary first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-2 text-xs leading-relaxed text-text-secondary last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 ml-4 list-disc space-y-0.5 text-xs text-text-secondary marker:text-accent/40">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-4 list-decimal space-y-0.5 text-xs text-text-secondary marker:text-accent/40">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-xs leading-relaxed text-text-secondary">{children}</li>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block rounded-lg bg-void/80 p-3 font-mono text-[11px] leading-relaxed text-accent-dim">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded border border-border-subtle bg-overlay/80 px-1.5 py-0.5 font-mono text-[11px] text-accent">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg border border-border-subtle bg-void/60 shadow-elevation-1">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto rounded-lg border border-border-subtle shadow-elevation-1">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border-active bg-overlay/60">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-accent-dim">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-t border-border-subtle px-2.5 py-1.5 text-xs text-text-secondary">
      {children}
    </td>
  ),
  tr: ({ children }) => (
    <tr className="transition-colors hover:bg-white/[0.02]">{children}</tr>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 rounded-r-lg border-l-2 border-accent/40 bg-glass-cyan py-1 pl-3 pr-2 text-xs italic text-text-muted">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border-subtle" />,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:text-accent-dim hover:decoration-accent"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-text-muted">{children}</em>
  ),
  input: ({ checked, ...rest }) => (
    <input
      {...rest}
      checked={checked}
      disabled
      type="checkbox"
      className="mr-1.5 accent-accent"
    />
  ),
};

// ─── Compact variants ────────────────────────────────────────────────────────
// Tighter spacing for agent stream / chat contexts where vertical space matters.

const compactComponents: Components = {
  ...components,
  h1: ({ children }) => (
    <h1 className="mb-1 mt-2 text-xs font-bold text-text-primary first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1 mt-1.5 text-xs font-bold text-text-primary first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-0.5 mt-1 text-xs font-semibold text-text-secondary first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-1 text-xs leading-relaxed text-text-secondary last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-1 ml-3 list-disc space-y-0 text-xs text-text-secondary marker:text-accent/40">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-1 ml-3 list-decimal space-y-0 text-xs text-text-secondary marker:text-accent/40">{children}</ol>
  ),
  pre: ({ children }) => (
    <pre className="mb-1 overflow-x-auto rounded-lg border border-border-subtle bg-void/60">
      {children}
    </pre>
  ),
};

// ─── Component ───────────────────────────────────────────────────────────────

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** Compact mode: tighter spacing for inline/chat contexts */
  compact?: boolean;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className = "",
  compact = false,
}: MarkdownRendererProps) {
  // Memoize to avoid re-parsing unchanged content
  const rendered = useMemo(() => {
    if (!content) return null;
    return (
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={compact ? compactComponents : components}
      >
        {content}
      </ReactMarkdown>
    );
  }, [content, compact]);

  if (!rendered) return null;

  return (
    <div className={`markdown-content ${className}`}>
      {rendered}
    </div>
  );
});
