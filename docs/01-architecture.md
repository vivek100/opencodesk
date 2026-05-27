# Architecture

## Overview

Open Cowork v2 is a Next.js 15 app that provides an AI coding assistant with a live cloud sandbox preview. The user describes what to build, and the AI agent scaffolds it in a Blaxel cloud sandbox, showing a live preview in an iframe.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| AI Backend | Vercel AI SDK v6 + OpenAI GPT-4o |
| Chat UI | assistant-ui v0.14 (primitives + high-level components) |
| Runtime Adapter | @assistant-ui/react-ai-sdk (AssistantChatTransport) |
| Sandbox | Blaxel cloud sandboxes (@blaxel/core) |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |

## Directory Structure

```
v2/
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts      # POST endpoint — streams LLM with sandbox tools
│   │   ├── layout.tsx             # Root layout (dark mode)
│   │   ├── page.tsx               # Entry → CoworkApp
│   │   └── globals.css            # Tailwind v4 theme
│   ├── components/
│   │   ├── assistant-ui/          # High-level components (copied from @assistant-ui/ui source)
│   │   │   ├── thread.tsx         # Full Thread: messages, composer, action bars, branch picker
│   │   │   ├── tool-fallback.tsx  # Collapsible tool call display
│   │   │   └── tooltip-icon-button.tsx
│   │   ├── canvas/                # Live preview panel
│   │   │   ├── canvas.tsx         # Iframe with refresh/open controls
│   │   │   └── canvas-observer.tsx # Watches refreshCanvas tool results → triggers preview
│   │   ├── shell/                 # App shell
│   │   │   ├── shell.tsx          # Layout: Thread panel + Canvas panel
│   │   │   └── header-actions.tsx # Header with "New Chat" button
│   │   ├── ui/                    # Base UI components (button, tooltip, collapsible)
│   │   └── cowork-app.tsx         # Runtime provider + session management
│   └── lib/
│       ├── sandbox.ts             # @blaxel/core wrapper (provision, exec, preview)
│       ├── tools.ts               # AI SDK tool definitions for the LLM
│       └── utils.ts               # cn() helper
├── .env.example                   # Required environment variables
├── package.json
├── tsconfig.json
├── next.config.ts
└── postcss.config.mjs
```

## Data Flow

```
User types message
    ↓
CoworkApp (AssistantChatTransport → POST /api/chat)
    ↓
route.ts: streamText(openai("gpt-4o"), tools, system prompt)
    ↓
LLM calls tools:
  1. provisionSandbox → creates Blaxel sandbox
  2. exec → runs shell commands (write files, install deps, start server)
  3. refreshCanvas → returns preview URL
    ↓
CanvasObserver detects refreshCanvas result
    ↓
Canvas iframe loads the live preview URL
```

## Key Design Decisions

1. **Single API route** — No separate backend server. The Next.js route handles everything.
2. **Session-based sandboxes** — Each chat session gets its own sandbox (named by session ID).
3. **assistant-ui components** — Copied from source rather than using primitives directly. This gives us the full UX (action bars, edit mode, branch picker, tool fallback) without custom implementation.
4. **Tool-only agent** — The LLM has exactly 3 tools: provisionSandbox, exec, refreshCanvas. No docs tools, no bash tools from the original.
