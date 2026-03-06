# Phase 5 — Diff Preview + File Tree

**Owner:** Frontend agent
**Skills:** `frontend-design`, `next-best-practices`

## File Diff Preview (`src/components/FileDiffPreview.tsx`)

- [ ] Git-style unified diff display
- [ ] Red lines for removed, green lines for added, neutral for context
- [ ] Syntax highlighting per language (detect from file extension)
- [ ] Line numbers (before/after columns)
- [ ] File path breadcrumb header
- [ ] Collapse/expand hunks
- [ ] Copy diff button

## File Tree Panel

- [ ] Tree view of affected files from all tasks
- [ ] Change count badges per file
- [ ] Language icons (TypeScript, JavaScript, CSS, HTML, JSON, etc.)
- [ ] Click to open FileDiffPreview for that file
- [ ] Collapsible folder nodes
- [ ] Filter by agent / cycle

## Git Diff Integration

- [ ] Parse unified diff format from Fixer agent `diff` fields in task timeline
- [ ] Group diffs by file across tasks
- [ ] Show chronological diff history per file

## Task Timeline → Diff Linkage

- [ ] In TaskDetail timeline entries, "View Diff" button when `diff` field present
- [ ] Opens FileDiffPreview inline or in a modal
- [ ] Cross-reference with build results (pass/fail indicator next to diff)

## Verification

- [ ] Diff renders correctly for multi-hunk changes
- [ ] Syntax highlighting works for TypeScript, JavaScript, CSS
- [ ] File tree reflects all modified files from task store
- [ ] Click-through from task timeline to diff works
- [ ] `npm run build` succeeds
