# Refactor Summary: v0 → v2

## What was the original (v0)?

The original `personalV0/` had two separate codebases:

1. **`augment/server/`** — A large Express.js agent backend with:
   - Mastra agent framework
   - Multiple tool categories (sandbox, docs, bash, readFile, etc.)
   - Complex workspace providers and session management
   - ~72 dependencies

2. **`codexv0frontend/`** — A Vite + React frontend with:
   - assistant-ui for the chat interface
   - Custom tool rendering
   - Separate dev server from backend

## What is v2?

A single, unified Next.js app that replaces both:

- **Backend**: One API route (`/api/chat/route.ts`) using Vercel AI SDK's `streamText`
- **Frontend**: assistant-ui components copied from the official source (same quality, no guessing)
- **Tools**: Only 3 sandbox tools (provisionSandbox, exec, refreshCanvas)
- **No separate server** — Next.js handles everything

## What was removed

| From v0 | Reason |
|---------|--------|
| Mastra agent framework | Replaced by AI SDK `streamText` with tools |
| Express.js server | Next.js API routes instead |
| Docs tools (listDocs, readDoc) | Not needed for sandbox-only use case |
| Bash tool (separate from exec) | Consolidated into `exec` tool |
| ReadFile tool | Agent uses `exec` with `cat` instead |
| Complex workspace-provider-blaxel | Simplified to `src/lib/sandbox.ts` |
| Multiple model support | Single model (gpt-4o) for simplicity |
| Separate frontend dev server | Single Next.js app |

## What was kept

- **Blaxel sandbox provisioning** — Same pattern (create-if-not-exists, retry, wait-until-reachable)
- **assistant-ui chat interface** — Same component library, now using the high-level Thread component
- **Canvas preview** — Iframe-based live preview with refresh controls
- **CanvasObserver** — Watches for `refreshCanvas` tool results to trigger preview updates
- **Session-based architecture** — Each chat session maps to one sandbox

## What was added

- **assistant-ui high-level components** — Copied from `@assistant-ui/ui` source:
  - `thread.tsx` — Full thread with messages, composer, action bars, branch picker, edit mode
  - `tool-fallback.tsx` — Collapsible tool call display with status, args, results
  - `tooltip-icon-button.tsx` — Icon buttons with tooltips
  - `button.tsx`, `tooltip.tsx`, `collapsible.tsx` — Base UI components
- **Tailwind CSS v4** — Modern theme system with `@theme` block
- **Turbopack** — Fast dev server via `next dev --turbopack`

## Key differences

| Aspect | v0 | v2 |
|--------|----|----|
| Architecture | 2 separate apps (Express + Vite) | 1 Next.js app |
| Backend framework | Mastra + Express | AI SDK streamText |
| Dependencies | ~72 (server) + ~40 (frontend) | ~25 total |
| Tools | 6+ tools | 3 tools |
| Agent complexity | High (workspace policies, tool filtering) | Low (flat tool list) |
| Component source | Hand-written primitives | Copied from assistant-ui/ui source |
| CSS | Tailwind v3 | Tailwind v4 |
| Lines of code | ~2000+ across both apps | ~800 total |
