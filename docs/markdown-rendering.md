# Markdown Rendering System

Endstate uses `react-markdown` with `remark-gfm` to render agent output as formatted markdown throughout the dashboard. All agent messages, task details, and the Intel panel render through the same component.

## Dependencies

```
react-markdown    — Core markdown-to-React renderer
remark-gfm        — GitHub Flavored Markdown (tables, strikethrough, task lists)
```

## MarkdownRenderer Component

**Location:** `src/components/MarkdownRenderer.tsx`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | required | Markdown text to render |
| `compact` | `boolean` | `false` | Tighter spacing for stream/chat contexts |
| `className` | `string` | `""` | Additional CSS classes |

### React Patterns

- **`memo()`** — The component is wrapped in `React.memo` to skip re-renders when content hasn't changed. This matters because agent stream entries can trigger frequent parent re-renders.
- **`useMemo()`** — The rendered ReactMarkdown output is memoized on `[content, compact]`. Markdown parsing is not free, so we avoid re-parsing unchanged content.
- **Hoisted static data** — The `remarkPlugins` array and both `components` objects are defined at module scope. React never sees a new reference, preventing ReactMarkdown from re-running its plugin pipeline.
- **Two component maps** — `components` (normal spacing) and `compactComponents` (tight spacing) are both module-level constants. The `compact` prop selects between them without creating new objects.

### Theming

All markdown elements use the Endstate design tokens:

| Element | Token Usage |
|---------|-------------|
| Headings | `text-text-primary`, uppercase tracking on h2 |
| Body text | `text-text-secondary`, `text-xs leading-relaxed` |
| Inline code | `bg-overlay/80`, `text-accent`, `border-border-subtle` |
| Code blocks | `bg-void/80`, `text-accent-dim`, `shadow-elevation-1` |
| Tables | `border-border-subtle`, `bg-overlay/60` header, hover rows |
| Blockquotes | `border-accent/40` left border, `bg-glass-cyan` fill |
| Links | `text-accent`, underline with animated hover |
| Lists | `marker:text-accent/40` for bullet/number color |
| Strong | `text-text-primary` (elevated from secondary) |

### Usage

```tsx
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

// Full rendering (Intel panel, task details)
<MarkdownRenderer content={markdownString} />

// Compact rendering (agent stream, chat panel)
<MarkdownRenderer content={entry.content} compact />
```

## Where Markdown Renders

| Component | Context | Mode |
|-----------|---------|------|
| `ProjectKnowledge` | Intel tab — cheat sheet view | Full |
| `AgentStream` | Main activity feed — agent messages | Compact |
| `AgentChatPanel` | Per-agent chat modal — messages | Compact |
| `TaskDetail` | Task modal — event details & reasoning | Compact |

Tool calls, system messages, and error messages remain plain text (monospace). Only `message` type entries get markdown rendering.
