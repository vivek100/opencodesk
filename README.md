# OpenCoDesk

A **starter template** for building file-centric AI cowork apps: shared cloud drive, session-scoped folders, rich file preview, live browser preview, and durable markdown memory — powered by [Blaxel](https://blaxel.ai) sandboxes, [assistant-ui](https://www.assistant-ui.com/), and Next.js.

Use it as a working app or fork it to build your own agent workspace product.

## What you get

- **Chat + threads** — Persistent history (libSQL / Turso) with assistant-ui
- **Shared drive** — Blaxel Drive mounted at `/workspace` for every sandbox
- **Session workspace** — Per-chat `uploads/`, `outputs/`, `work/` folders
- **Canvas** — Files tab (tree + preview) and Browser tab (live preview)
- **Agent tools** — `provisionSandbox`, `exec`, `showFile`, `showBrowser`
- **Memory wiki** — Cross-session markdown at `/workspace/memory/`

**Not included by design:** auth, billing, multi-tenant isolation. Add those for production SaaS.

## Prerequisites

- Node.js 20+
- [OpenAI API key](https://platform.openai.com/api-keys)
- [Blaxel](https://app.blaxel.ai) workspace + API key

## Quick start

```bash
cp .env.example .env.local
# Edit .env.local — set OPENAI_API_KEY, BL_WORKSPACE, BL_API_KEY

npm install
npm run setup   # Creates drive + FS sandbox, workspace dirs, memory seed
npm run dev
```

Open http://localhost:3000

### What `npm run setup` does

1. Creates (or reuses) Blaxel Drive `opencodesk-drive` and FS sandbox `opencodesk-fs`
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

## Architecture

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

## Deployment notes

- Set all env vars on your host (Vercel, etc.); run `npm run setup` once from a machine with Blaxel credentials, or set `BL_DRIVE_ID` / `BL_FS_SANDBOX` manually.
- Use Turso (`DATABASE_URL` + `DATABASE_AUTH_TOKEN`) for production persistence.
- Preview proxies **port 3000** on `0.0.0.0` in the agent sandbox.

## Stack

Next.js 15 · Vercel AI SDK v6 · assistant-ui · Blaxel · libSQL/Drizzle · Tailwind CSS v4

## License

MIT — see [LICENSE](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md).
