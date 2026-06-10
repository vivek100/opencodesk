# OpenCoDesk

A **starter template** for building file-centric AI cowork apps on **[Blaxel](https://blaxel.ai)** — persistent drive, resumable sandboxes, live preview URLs, and a canvas UI — wired up with [assistant-ui](https://www.assistant-ui.com/) and Next.js.

Use it as a working app or fork it to build your own agent workspace product.

## Key Features in the app?

Most AI coding demos stop at chat. OpenCoDesk shows what becomes possible when you combine Blaxel's compute and storage primitives:

| Primitive | What it unlocks | Where OpenCoDesk uses it |
|-----------|-----------------|--------------------------|
| **[@blaxel/core SDK](https://blaxel.ai)** | One SDK for drives, sandboxes, exec, filesystem, and previews — no custom infra glue | `scripts/setup.ts`, `src/lib/sandbox.ts`, file/upload APIs |
| **Blaxel Agent Drive** | Durable shared cloud filesystem across chats — not ephemeral container disk | One Agent Drive mounted at `/workspace`; agent writes and UI reads the same files |
| **Sandboxes** | Isolated microVM per thread for shell work, installs, and servers | `provisionSandbox` → `SandboxInstance.createIfNotExists` per chat |
| **Fast resume / standby** | Sandboxes resume instead of cold-starting every message | `createIfNotExists` + `SandboxInstance.get`; idle cleanup via `SANDBOX_TTL_DAYS` |
| **Built-in preview URLs** | Public HTTPS preview for port 3000 — no ngrok or tunnel setup | `sb.previews.createIfNotExists` → `showBrowser` → Browser tab iframe |
| **Sandbox MCP** | Standard MCP interface to sandbox tooling (extend beyond custom tools) | Not wired in this template — see [Extend with Blaxel](#extend-with-blaxel) |

**The dev win:** you get durable files, isolated compute, and live previews without building S3 + runners + tunneling yourself. OpenCoDesk is the reference wiring — ~4 agent tools and a file canvas on top.

## What you get

- **Chat + threads** — Persistent history (libSQL / Turso, or [assistant-ui Cloud](https://cloud.assistant-ui.com) when configured)
- **Blaxel-native stack** — Shared drive, per-thread sandboxes, preview URLs, SDK-first setup (`npm run setup`)
- **Session workspace** — Per-chat `uploads/`, `outputs/`, `work/` folders on the drive
- **Canvas** — Files tab (tree + rich preview) and Browser tab (live preview)
- **Agent tools** — `provisionSandbox`, `exec`, `showFile`, `showBrowser`
- **Memory wiki** — Cross-session markdown at `/workspace/memory/`

**Not included by design:** auth, billing, multi-tenant isolation. Add those for production SaaS.

## How Blaxel powers this template

Two sandboxes share one **Blaxel Agent Drive**: a **sandbox** is an isolated microVM where the agent runs shell commands and dev servers — sandboxes resume from standby in under **25ms**. A **Blaxel Agent Drive** is a cloud-native distributed filesystem with effectively unlimited capacity, shared across sandboxes so files persist beyond any single VM.

```
User chat + uploads
       ↓
   Next.js app
       ↓
┌──────────────────┐     ┌──────────────────┐
│ Agent sandbox    │     │ FS sandbox       │
│ (per thread)     │     │ (file APIs)      │
│ exec, servers    │     │ ls, read, upload │
└────────┬─────────┘     └────────┬─────────┘
         └──────────┬─────────────┘
                    ↓
         Blaxel Agent Drive  /workspace
              ├── sessions/<threadId>/
              └── memory/
```

- **Agent sandbox** — LLM runs `exec`, writes files, starts dev servers. Files land on the drive immediately.
- **FS sandbox** — Dedicated sandbox for `/api/files` and `/api/upload`. Same drive, read-only from the app's perspective.
- **Preview** — Agent sandbox exposes port 3000 via Blaxel preview URL; `showBrowser` loads it in the canvas.

Key files: `src/lib/sandbox.ts` (provision, exec, preview), `src/lib/tools.ts` (agent tools), `scripts/setup.ts` (drive + FS sandbox bootstrap).

## Prerequisites

- Node.js 20+
- [OpenAI API key](https://platform.openai.com/api-keys)
- [Blaxel](https://app.blaxel.ai) workspace + API key — requires a free Blaxel account ([sign up](https://app.blaxel.ai) with **$100 starter credits**, no credit card required)

## Quick start

```bash
cp .env.example .env.local
# Edit .env.local — set OPENAI_API_KEY, BL_WORKSPACE, BL_API_KEY

npm install
npm run setup   # Creates drive + FS sandbox, workspace dirs, memory seed
npm run dev
```

Open http://localhost:3000

### Try with sample data

Upload files from [`samples/`](samples/) to test agent analysis:

- **`sales-q1.xlsx`** — quick smoke test (16 rows, Q1 SaaS sales)
- **`superstore-sales.xlsx`** — retail sample (~2k orders; full CSV also in `samples/`)
- **`retail-inventory.xlsx`** — stock levels and reorder alerts
- **`expense-claims.xlsx`** — department expenses and approval status

See [`samples/README.md`](samples/README.md) for suggested prompts and data sources.

### What `npm run setup` does

1. Creates (or reuses) Blaxel Agent Drive `opencodesk-drive` and FS sandbox `opencodesk-fs`
2. Mounts the drive at `/workspace` on the FS sandbox
3. Writes `BL_DRIVE_ID` and `BL_FS_SANDBOX` to `.env.local`
4. Creates `/workspace/sessions` and `/workspace/memory/{projects,entities}`
5. Removes legacy flat files at `/workspace` root (keeps only `sessions/` and `memory/`)
6. Seeds memory files: `AGENTS.md`, `index.md`, `log.md`, `user.md` (if missing)

After setup, the Files tab should show `memory/` and `sessions/`. Starting a chat triggers `provisionSandbox`, which creates `sessions/<threadId>/uploads|outputs|work`.

## Workspace contract

```
/workspace/
  sessions/
    <threadId>/
      uploads/     # User uploads (composer attachments)
      outputs/     # Deliverables for the user
      work/        # Scratch / intermediate files
  memory/
    AGENTS.md      # Memory conventions
    index.md       # Page catalog
    log.md         # Append-only update log
    user.md        # User preferences
    projects/
    entities/
```

## Display tools

| Tool | When to use |
|------|-------------|
| `provisionSandbox` | Once per chat before reading/writing the drive |
| `exec` | Shell commands in the sandbox |
| `showFile` | After creating/updating a user-facing artifact |
| `showBrowser` | After dev server on port 3000 is confirmed ready |

## File preview

| Type | Library |
|------|---------|
| Code | shiki |
| Markdown | react-markdown + remark-gfm |
| CSV | papaparse |
| Images / PDF | Binary API + `<img>` / `<iframe>` |
| Excel | xlsx |
| Word | mammoth |

## Customize

| Goal | Where |
|------|--------|
| System prompt | `src/app/api/chat/route.ts` |
| Tools | `src/lib/tools.ts` |
| Memory seed | `src/lib/memory-seed.ts` |
| Drive / sandbox names | `scripts/setup.ts` |
| Model | `src/app/api/chat/route.ts` (`openai("...")`) |
| Starter suggestions | `src/runtime/cowork-provider.tsx` |

## Extend with Blaxel

This template uses the Blaxel SDK directly via custom AI SDK tools. You can go further with Blaxel's platform:

- **Sandbox MCP** — Connect Blaxel's sandbox MCP server for a standard tool interface alongside or instead of custom tools
- **Different sandbox images** — Set `BL_SANDBOX_TEMPLATE` (e.g. Python, custom images)
- **Drive as source of truth** — All session artifacts and memory live on the drive; add your own folders under `/workspace` without changing the app DB

See [Blaxel docs](https://docs.blaxel.ai) for the [SDK reference](https://docs.blaxel.ai/sdk-reference/introduction), [Agent Drive](https://docs.blaxel.ai/Agent-drive/Overview), and [Sandbox MCP](https://docs.blaxel.ai/Sandboxes/MCP) setup.

## App architecture

```
src/
├── app/api/          # chat, files, upload, threads
├── components/
│   ├── canvas/       # Files, Browser, FileViewer, CanvasObserver
│   ├── shell/        # layout, header (New Chat, Show Drive)
│   └── assistant-ui/
├── lib/              # sandbox, tools, memory-seed, db, attachment-adapter
└── runtime/          # cowork-provider (threads + chat runtime)
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `BL_WORKSPACE` | Yes | Blaxel workspace name |
| `BL_API_KEY` | Yes | Blaxel API key |
| `BL_DRIVE_ID` | Auto | Set by `npm run setup` |
| `BL_FS_SANDBOX` | Auto | Set by `npm run setup` |
| `BL_REGION` | No | Blaxel region |
| `BL_SANDBOX_TEMPLATE` | No | Sandbox image (default `blaxel/node:latest`) |
| `DATABASE_URL` | No | Turso URL (default: local `./data/local.db`) |
| `SANDBOX_TTL_DAYS` | No | Idle sandbox cleanup (default `2`) |
| `NEXT_PUBLIC_ASSISTANT_BASE_URL` | No | assistant-ui Cloud Frontend API URL — enables cloud thread persistence + run telemetry |
| `ASSISTANT_API_KEY` | No | assistant-ui Cloud API key (server-side auth; optional for anonymous demo) |

### assistant-ui Cloud (optional)

To persist threads and inspect run traces in the [assistant-ui Cloud dashboard](https://cloud.assistant-ui.com) instead of local libSQL:

1. Create a project at [cloud.assistant-ui.com](https://cloud.assistant-ui.com)
2. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_ASSISTANT_BASE_URL=https://proj-[YOUR-ID].assistant-api.com
   ASSISTANT_API_KEY=sk_aui_proj_...
   ```
3. Restart `npm run dev` — the app auto-switches to cloud persistence when `NEXT_PUBLIC_ASSISTANT_BASE_URL` is set.

Cloud mode uses anonymous browser-session auth for local testing. Blaxel sandbox session folders still key off the cloud thread ID. Remove the env var to revert to local libSQL threads.

## Deployment notes

- Set all env vars on your host (Vercel, etc.); run `npm run setup` once from a machine with Blaxel credentials, or set `BL_DRIVE_ID` / `BL_FS_SANDBOX` manually.
- Blaxel handles sandbox lifecycle (create, resume, preview); you handle app hosting and chat DB.
- Use Turso (`DATABASE_URL` + `DATABASE_AUTH_TOKEN`) for production persistence.
- Preview proxies **port 3000** on `0.0.0.0` in the agent sandbox.

## Stack

| Layer | Technology |
|-------|------------|
| UI / chat | Next.js 15, assistant-ui, Vercel AI SDK v6 |
| Persistence | libSQL / Turso, Drizzle ORM |
| **Compute & files** | **Blaxel Agent Drive, Sandboxes, @blaxel/core** |
| Styling | Tailwind CSS v4 |

## License

MIT — see [LICENSE](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md).
