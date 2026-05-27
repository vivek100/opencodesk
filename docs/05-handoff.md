# Open Cowork V2 — Handoff Document

> Use this doc to onboard a new conversation. It captures everything built so far, key architecture decisions, and exactly what remains.

---

## Quick Context

**Open Cowork** is a developer starter template for building an AI coding assistant with cloud sandboxes. It uses Next.js 15, assistant-ui, Vercel AI SDK v6, Blaxel (sandboxes + drives), and libSQL/Drizzle for persistence.

Full requirements and plan: `docs/04-v2-requirements-and-plan.md`

---

## What's Built (Phases 1–7) ✅

### Phase 1: Database Layer + API Routes
- **DB**: libSQL via `@libsql/client`, Drizzle ORM. Local file at `./data/local.db` (auto-created), or Turso via `DATABASE_URL`.
- **Schema**: `threads` + `messages` tables in `src/lib/db/schema.ts`
- **Auto-migrate**: `src/lib/db/migrate.ts` — pushes schema on first request
- **API routes** (all working):
  - `GET/POST /api/threads` — list/create
  - `GET/PATCH/DELETE /api/threads/[id]` — single thread CRUD
  - `GET/POST /api/threads/[id]/messages` — message persistence
  - `POST /api/threads/[id]/title` — LLM-generated title
  - `POST /api/chat` — streaming chat (existing, updated)

### Phase 2: Thread Persistence & Provider
- `src/lib/thread-adapter.ts` — `RemoteThreadListAdapter` + `unstable_Provider` with `ThreadHistoryAdapter` using `withFormat`
- `src/runtime/cowork-provider.tsx` — `useRemoteThreadListRuntime` wrapping `useChatRuntime`
- `src/components/cowork-app.tsx` — wraps Shell with `SidebarProvider` + `ThreadListSidebar`

### Phase 3: Thread List Sidebar
- `src/components/threadlist-sidebar.tsx` — branded as "Open Cowork", uses assistant-ui primitives
- `src/components/thread-list.tsx` — thread list UI
- `src/components/shell/header-actions.tsx` — sidebar toggle button in header

### Phase 4: Canvas Panel (Tabbed)
- `src/components/canvas/canvas-panel.tsx` — tabbed container (Browser + Files tabs)
- `src/components/canvas/browser-tab.tsx` — iframe preview with refresh + open-external controls
- `src/components/canvas/files-tab.tsx` — real file tree with:
  - Lazy-loaded folder expansion (fetches children on click)
  - Incremental refresh after each `exec` tool call (800ms debounce, preserves expansion state)
  - Inline file viewer (read-only, monospace)
  - Refresh button, error/retry states
- `src/components/canvas/canvas-observer.tsx` — watches tool calls, emits tab switches:
  - `provisionSandbox` result → Files tab
  - `refreshCanvas` result → Browser tab
- `src/components/shell/shell.tsx` — manages tab state, canvas visibility, responds to observer events

### Phase 4b: First-Run Setup + Shared Drive
- `scripts/setup.ts` — `npm run setup` script that:
  1. Creates shared Blaxel Drive (`open-cowork-drive`)
  2. Creates dedicated FS sandbox (`open-cowork-fs`) mounting that drive
  3. Persists `BL_DRIVE_ID` and `BL_FS_SANDBOX` to `.env.local`
- `src/lib/sandbox.ts` — agent exec sandboxes also mount the shared drive at `/workspace` (via `BL_DRIVE_ID`)
- `src/lib/tools.ts` — `provisionSandbox` tool persists `sandboxId` on the thread row after provisioning

### File APIs (dedicated FS sandbox)
- `GET /api/files?path=/workspace` — lists directory via `sb.fs.ls()` on the dedicated FS sandbox
- `GET /api/files/content?path=/workspace/file.ts` — reads file content via `sb.fs.read()`
- Both use `BL_FS_SANDBOX` env var (not the agent's exec sandbox)
- The FS sandbox and exec sandboxes share the same Blaxel Drive — files written by the agent appear in the file tree

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| **Dedicated FS sandbox** (`BL_FS_SANDBOX`) | Separate from agent's exec sandbox. Used solely for file listing/reading/uploading APIs. Both mount the same Blaxel Drive. |
| **Agent exec sandbox** per thread | Named via `toSandboxName(threadId)`. Provisioned on demand by the agent. |
| **Shared Blaxel Drive** | The product feature that connects both sandboxes. Files written in exec sandbox appear in FS sandbox. |
| **`npm run setup`** (not auto-setup) | Explicit CLI script for first-run. Creates drive + FS sandbox, persists to `.env.local`. |
| **Lazy tree refresh on exec** | After each completed `exec` tool call, debounced 800ms refresh of root + expanded folders. Preserves expansion state. |
| **No auth** | Explicitly excluded — template focuses on uncommon patterns (sandbox orchestration, file integration, multi-thread persistence). |
| **libSQL local file** for dev | `./data/local.db`. Production uses Turso via `DATABASE_URL`. Zero native deps. |

---

## Key Files Reference

```
src/
├── app/api/
│   ├── chat/route.ts              # LLM streaming + sandbox tools + starts cleanup
│   ├── files/route.ts             # GET file listing (FS sandbox)
│   ├── files/content/route.ts     # GET file content (FS sandbox)
│   ├── upload/route.ts            # POST multipart upload → FS sandbox
│   └── threads/                   # Full thread CRUD + messages + title
├── components/
│   ├── canvas/
│   │   ├── canvas-panel.tsx       # Tabbed container (Browser | Files)
│   │   ├── browser-tab.tsx        # iframe preview
│   │   ├── files-tab.tsx          # File tree + viewer (lazy refresh)
│   │   └── canvas-observer.tsx    # Tool call → tab switch events
│   ├── shell/
│   │   ├── shell.tsx              # Main layout, canvas state
│   │   └── header-actions.tsx     # Sidebar toggle
│   ├── cowork-app.tsx             # SidebarProvider + ThreadListSidebar wrapper
│   ├── threadlist-sidebar.tsx     # Branded sidebar
│   └── thread-list.tsx            # Thread list UI
├── lib/
│   ├── attachment-adapter.ts      # Custom AttachmentAdapter → POST /api/upload
│   ├── db/client.ts               # libSQL client
│   ├── db/schema.ts               # Drizzle schema (threads + messages)
│   ├── db/migrate.ts              # Auto-migrate
│   ├── sandbox.ts                 # Blaxel sandbox provision/exec + toSandboxName
│   ├── sandbox-cleanup.ts         # Stale sandbox cleanup (TTL + delete)
│   ├── tools.ts                   # LLM tools (provisionSandbox, exec, refreshCanvas)
│   └── thread-adapter.ts          # RemoteThreadListAdapter + history
├── runtime/
│   └── cowork-provider.tsx        # useRemoteThreadListRuntime
scripts/
└── setup.ts                       # First-run: create drive + FS sandbox
```

---

## Environment Variables

```env
# Required (set manually in .env.local)
OPENAI_API_KEY=sk-...
BL_API_KEY=...
BL_WORKSPACE=...

# Auto-created by `npm run setup`
BL_DRIVE_ID=open-cowork-drive
BL_FS_SANDBOX=open-cowork-fs

# Optional
DATABASE_URL=libsql://...         # Turso for production
DATABASE_AUTH_TOKEN=...
BL_REGION=us-pdx-1
SANDBOX_TTL_DAYS=2
```

---

## What Remains (Phases 5–7)

### Phase 5: File Upload ✅
1. **`POST /api/upload`** endpoint — accepts multipart form data, writes to FS sandbox via `sb.fs.writeBinary()` (25 MB limit per file, optional `path` field)
2. **Attachment button** in composer using `ComposerPrimitive.AddAttachment` + `ComposerPrimitive.Attachments`
3. **Send disabled during upload** — handled automatically by assistant-ui runtime (attachment in `running` state)
4. **File tree refresh** — `attachment-adapter.ts` dispatches `drive-upload-complete` event; `FilesTab` listens and refreshes

### Phase 6: Sandbox TTL Cleanup ✅
1. **`cleanupStaleSandboxes()`** in `src/lib/sandbox-cleanup.ts` — queries threads where `updated_at < now - TTL_DAYS` (default 2) and `sandbox_id IS NOT NULL`
2. **Deletes sandboxes** via `SandboxInstance.delete()` — treats 404/not-found as success (already gone)
3. **Nulls `sandbox_id`** on the thread row after deletion
4. **Runs on boot + every 6 hours** — `startSandboxCleanup()` called in `/api/chat/route.ts` (idempotent guard ensures once per app lifecycle)
5. **Transparent to user** — expired sandbox means agent calls `provisionSandbox` again

### Phase 7: Agent Prompt & Polish ✅
1. **System prompt updated** — mentions shared Blaxel Drive, file tab (auto-refreshes), browser tab (only via `refreshCanvas`)
2. **Agent canvas guidance** — explicit instructions: "After writing files, Files tab updates automatically — no need to call refreshCanvas. Call refreshCanvas only when dev server running and you want live preview."
3. **Error boundaries** — `ErrorBoundary` component wraps `Thread`, `CanvasPanel`, `BrowserTab`, `FilesTab`, and `ThreadList`
4. **Loading skeletons** — thread list already had skeletons; added file tree skeletons for initial load
5. **Mobile responsive** — `< md`: chat full width, floating FAB toggles canvas overlay. `≥ md`: two-column layout. Touch targets ≥ 44px.

---

## Known Issues / Gaps

- **Thread list manual testing**: Sidebar is wired up but rename/archive/delete not manually verified.
- **react-arborist installed but unused**: We built a custom file tree instead. `react-arborist` can be removed from deps if not needed later.
- **Shiki warning**: Dev server shows warnings about `shiki` package externalization — cosmetic only, no runtime impact.
- **First-run setup**: `npm run setup` must be run manually to create the Blaxel Drive and FS sandbox.

---

## How to Continue

1. Read `docs/04-v2-requirements-and-plan.md` for full requirements context
2. Read this handoff doc for current state
3. All phases 1–7 are complete. Next steps could be:
   - Manual QA of thread list operations (rename, archive, delete)
   - Remove unused `react-arborist` dependency
   - Add auth if needed (was explicitly excluded from template scope)
   - Add more agent tools or polish the UI further
4. The TypeScript build is clean (`npx tsc --noEmit` passes with exit 0)
5. Dev server: `npm run dev` (port 3000)
