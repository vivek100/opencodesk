# Open Cowork V2 — Requirements & Implementation Plan

## What This Is

A **developer starter template** for building an AI coding assistant with cloud sandboxes. Clone it, run `npm install && npm run dev`, and you have a working ChatGPT-style app that can provision sandboxes, run code, show live previews, and browse files — all backed by persistent thread history.

**Not included by design**: auth, payments, analytics. Those are well-covered elsewhere. This template focuses on the uncommon parts — sandbox orchestration, file system integration, multi-thread persistence with assistant-ui, and a polished responsive layout.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router, Turbopack) | Standard for templates, great DX |
| Chat UI | `@assistant-ui/react` + `@assistant-ui/react-ai-sdk` | First-class thread management, composable primitives |
| AI SDK | Vercel AI SDK v6 | `streamText`, tool calling, `UIMessage` format |
| Database | libSQL via `@libsql/client` | SQLite-compatible, works serverless (Turso), zero native deps |
| ORM | Drizzle | Type-safe, lightweight, works with libSQL and Postgres |
| Styling | Tailwind CSS v4 | Already in the project |
| Icons | Lucide React | Already in the project |
| File tree | `react-arborist` | Performant, modern, good API |
| Sandbox | Blaxel SDK (`@blaxel/core`) | Cloud sandbox + drive |

---

## Core Requirements

### 1. Landing Page & Chat UX

- **Initial state**: Clean centered composer, no chrome. Suggestion chips optional.
- **On first message**: Thread component streams the response (current behavior).
- **On sandbox provision**: Canvas panel slides in from the right.
- **Layout**: Single-column until canvas appears, then two-column (chat 40% + canvas 60%). On mobile, full-screen chat with a bottom tab bar to switch to canvas.

### 2. Sidebar (Thread List)

- **Component**: assistant-ui's `ThreadListSidebar` (from `shadcn` registry) wrapping `SidebarProvider` / `SidebarInset`.
- **Desktop**: Collapsible sidebar (280px expanded). Trigger button in the header. Does **not** push content — overlays on mobile, inset on desktop.
- **Mobile**: Drawer that slides in from the left, closes on thread select.
- **Data**: Backed by `RemoteThreadListAdapter` → hits `/api/threads/*` routes → reads from Drizzle/libSQL.
- **Thread actions**: Rename, archive, delete via `ThreadListItemMorePrimitive`.

### 3. Canvas Panel (Tabbed)

The right-hand panel has **two tabs**, controlled by the agent via tool calls:

| Tab | Trigger | Content |
|---|---|---|
| **Browser** | `refreshCanvas` tool call | iframe preview of the running app (port 3000 proxy) |
| **Files** | `provisionSandbox` tool call | File tree from Blaxel drive (lazy-loaded) + inline file viewer |

- Agent can switch tabs by calling the relevant tool (e.g., after writing files, show the Files tab; after starting a server, show the Browser tab).
- User can manually switch tabs at any time.
- On mobile: Canvas is a full-screen overlay toggled via a floating button. Tabs still work inside it.

### 4. Thread Persistence (assistant-ui pattern)

Follow assistant-ui's **`RemoteThreadListRuntime`** pattern exactly:

```
CoworkProvider
  └── useRemoteThreadListRuntime({
        runtimeHook: () => useChatRuntime({ transport }),
        adapter: threadListAdapter,  // RemoteThreadListAdapter
      })
```

**Two tables** (Drizzle + libSQL):
- `threads` — id, title, status, sandbox_id, drive_id, created_at, updated_at
- `messages` — id, thread_id, parent_id, format, content, created_at

**Two adapter layers**:
- `RemoteThreadListAdapter` — CRUD on thread metadata via `/api/threads/*`
- `ThreadHistoryAdapter` (via `unstable_Provider` + `withFormat`) — message persistence via `/api/threads/[id]/messages`

**No hand-rolled session state.** assistant-ui manages the active thread, switching, and message hydration. We just provide the storage endpoints.

### 5. File Upload

- **UI**: Attachment button in the composer (assistant-ui's composer attachment primitive).
- **Behavior**: Send button disabled while upload is in progress.
- **Flow**: File → `POST /api/upload` → write to Blaxel drive → drive panel refreshes → agent can access via `/workspace/`.
- **Limit**: 25MB per file.

### 6. Sandbox TTL & Cleanup

- **Sandbox TTL**: 2 days from last activity (`updated_at` on the thread row).
- **Cleanup**: Background cron or on-demand check:
  - On app boot and every 6 hours, query threads where `updated_at < now - 2 days` and `sandbox_id IS NOT NULL`.
  - Call Blaxel API to delete those sandboxes.
  - Set `sandbox_id = NULL` on the thread row.
- **Reconnect**: No special UX needed. When the user sends a message in a thread whose sandbox expired, the agent calls `provisionSandbox` as usual — that tool already handles creating a new sandbox if the old one was deleted. Seamless from the user's perspective.

### 7. Mobile Responsiveness

- **Breakpoint**: `md` (768px).
- **< md**: Single column. Sidebar is a drawer. Canvas is a full-screen overlay with a toggle button. Thread + composer fill the screen.
- **≥ md**: Two-column layout. Sidebar is collapsible inset. Canvas slides in on the right.
- All touch targets ≥ 44px. No hover-only interactions on mobile.

---

## Architecture

### Component Tree

```
layout.tsx
└── CoworkProvider              ← useRemoteThreadListRuntime + AssistantRuntimeProvider
    └── SidebarProvider
        ├── ThreadListSidebar   ← assistant-ui shadcn component, styled
        └── SidebarInset
            └── Shell
                ├── Header      ← sidebar trigger, new-chat button
                ├── Thread      ← assistant-ui thread (chat + composer)
                └── CanvasPanel ← tabbed: Browser | Files
                    ├── BrowserTab  ← iframe preview
                    └── FilesTab    ← react-arborist tree + file viewer
```

### File Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       ├── chat/route.ts               ← LLM streaming endpoint
│       ├── upload/route.ts             ← file upload to drive
│       └── threads/
│           ├── route.ts                ← GET (list) / POST (create)
│           └── [id]/
│               ├── route.ts            ← GET / PATCH / DELETE
│               ├── messages/route.ts   ← GET (list) / POST (append)
│               └── title/route.ts      ← POST (generate title)
├── components/
│   ├── assistant-ui/                   ← shadcn-generated, customized
│   │   ├── thread.tsx
│   │   ├── composer.tsx
│   │   ├── messages.tsx
│   │   ├── thread-list.tsx
│   │   └── threadlist-sidebar.tsx
│   ├── canvas/
│   │   ├── canvas-panel.tsx            ← tabbed container
│   │   ├── browser-tab.tsx             ← iframe preview
│   │   ├── files-tab.tsx               ← file tree + viewer
│   │   └── canvas-observer.tsx         ← watches tool calls for tab switching
│   ├── shell.tsx                       ← main layout
│   └── ui/                             ← sidebar, button, tabs (shadcn)
├── lib/
│   ├── db/
│   │   ├── client.ts                   ← libSQL client (local file or Turso URL)
│   │   ├── schema.ts                   ← Drizzle schema (threads + messages)
│   │   └── migrate.ts                  ← auto-migrate on first request
│   ├── sandbox.ts                      ← Blaxel sandbox provision/exec
│   ├── tools.ts                        ← LLM tool definitions
│   └── thread-adapter.ts              ← RemoteThreadListAdapter + history
└── runtime/
    └── cowork-provider.tsx             ← useRemoteThreadListRuntime wrapper
```

### Database Schema (Drizzle + libSQL)

```typescript
// lib/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const threads = sqliteTable("threads", {
  id: text("id").primaryKey(),
  title: text("title"),
  status: text("status", { enum: ["regular", "archived"] }).notNull().default("regular"),
  sandboxId: text("sandbox_id"),
  driveId: text("drive_id").notNull(),
  createdAt: text("created_at").notNull(),  // ISO string
  updatedAt: text("updated_at").notNull(),  // ISO string
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  format: text("format").notNull(),         // e.g. "aisdk-v6"
  content: text("content", { mode: "json" }).notNull(),
  createdAt: text("created_at").notNull(),
});
```

### Thread Adapter (client-side)

```typescript
// lib/thread-adapter.ts
// Implements RemoteThreadListAdapter — calls /api/threads/* endpoints.
// unstable_Provider injects ThreadHistoryAdapter with withFormat for message persistence.
// Follows the exact pattern from assistant-ui docs (custom-adapter guide).
```

### Runtime Provider

```typescript
// runtime/cowork-provider.tsx
// useRemoteThreadListRuntime({
//   runtimeHook: () => useChatRuntime({
//     transport: new AssistantChatTransport({ api: "/api/chat" }),
//   }),
//   adapter: threadListAdapter,
// })
```

### Canvas Tab Switching

```typescript
// canvas/canvas-observer.tsx
// Watches assistant messages for tool call results:
//   - provisionSandbox result → switch to Files tab, mark canvas visible
//   - refreshCanvas result    → switch to Browser tab
// Emits: onTabChange("browser" | "files"), onCanvasReady(url), onCanvasError(error)
```

---

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chat` | LLM streaming (existing) |
| GET | `/api/threads` | List threads (ordered by updatedAt desc) |
| POST | `/api/threads` | Create thread, return `{ id }` |
| GET | `/api/threads/[id]` | Fetch single thread metadata |
| PATCH | `/api/threads/[id]` | Update title or status |
| DELETE | `/api/threads/[id]` | Delete thread + cascade messages |
| GET | `/api/threads/[id]/messages` | List messages for thread |
| POST | `/api/threads/[id]/messages` | Append message |
| POST | `/api/threads/[id]/title` | Generate title from messages |
| POST | `/api/upload` | Upload file(s) to Blaxel drive |

---

## Implementation Plan

### Phase 1: Database & Thread API ✅ DONE
1. ✅ Install `@libsql/client`, `drizzle-orm`, `drizzle-kit`
2. ✅ Create `lib/db/schema.ts` (threads + messages tables)
3. ✅ Create `lib/db/client.ts` (libSQL client, reads `DATABASE_URL` or defaults to local file)
4. ✅ Create `lib/db/migrate.ts` (push schema on first request)
5. ✅ Build all `/api/threads/*` route handlers
6. ✅ Verify with curl / REST client

### Phase 2: Thread Persistence & Provider ✅ DONE
1. ✅ Create `lib/thread-adapter.ts` — `RemoteThreadListAdapter` + `unstable_Provider` with `ThreadHistoryAdapter` using `withFormat`
2. ✅ Create `runtime/cowork-provider.tsx` — `useRemoteThreadListRuntime` wrapping `useChatRuntime`
3. ✅ Replace current `CoworkApp` with new provider
4. ✅ Verify: send a message, reload page, messages survive

### Phase 3: Thread List Sidebar ✅ DONE
1. ✅ Install assistant-ui `threadlist-sidebar` and `sidebar` components via CLI
2. ✅ Wire `ThreadListSidebar` into the layout
3. ✅ Style to match dark theme
4. ⬜ Test: create threads, switch between them, rename, archive, delete (not yet manually verified)

### Phase 4: Canvas Panel (Tabbed) ✅ DONE
1. ✅ Refactor current `Canvas` into `CanvasPanel` with `BrowserTab` + `FilesTab`
2. ✅ Add tab state — default to Files when sandbox provisions, Browser when preview is ready
3. ✅ Update `CanvasObserver` to emit tab-switch events based on tool calls
4. ✅ Install `react-arborist`, build `FilesTab` with Blaxel filesystem API (lazy-load on folder expand)
5. ✅ Add inline file viewer (read-only, fetched on click)
6. ⬜ Responsive: full-screen overlay on mobile with toggle button

### Phase 4b: First-Run Setup ✅ DONE (added during implementation)
1. ✅ `npm run setup` script creates shared Blaxel Drive + dedicated FS sandbox
2. ✅ Persists `BL_DRIVE_ID` and `BL_FS_SANDBOX` to `.env.local`
3. ✅ Agent exec sandboxes mount the shared drive at `/workspace`
4. ✅ File APIs use the dedicated FS sandbox (separate from agent's exec sandbox)

### Phase 5: File Upload ⬜ NOT STARTED
1. ⬜ Create `POST /api/upload` endpoint (multipart → FS sandbox `sb.fs.write`)
2. ⬜ Add attachment button to composer (assistant-ui attachment primitive)
3. ⬜ Disable send while uploading
4. ⬜ Refresh file tree after upload completes

### Phase 6: Sandbox TTL ⬜ NOT STARTED
1. ⬜ Add cleanup function: query stale threads, delete sandboxes via Blaxel API, null out `sandbox_id`
2. ⬜ Run on app boot + setInterval (6 hours) in a server action or API route
3. ⬜ Expired sandbox is transparent — agent calls `provisionSandbox` which creates a new one automatically

### Phase 7: Agent Prompt & Polish ⬜ NOT STARTED
1. ⬜ Update system prompt: mention shared drive, file tab, browser tab
2. ⬜ Add agent instructions for when to call `refreshCanvas` vs when files tab is sufficient
3. ⬜ Error boundaries around canvas, file tree, thread list
4. ⬜ Loading skeletons for thread list, file tree, message history
5. ⬜ Mobile QA pass

---

## Defaults (Decisions Made)

| Question | Decision |
|---|---|
| Sidebar width | 280px (desktop), full-width drawer (mobile) |
| Canvas panel width | 60% of viewport, min 400px |
| File upload limit | 25MB per file |
| Sandbox TTL | 2 days from last `updated_at` |
| Thread auto-title | Yes, via `generateTitle` adapter method (LLM call) |
| Drive model | One shared Blaxel Drive (`BL_DRIVE_ID`), mounted on both exec + FS sandboxes |
| DB location | `./data/local.db` (local dev), `DATABASE_URL` env var (production/Turso) |

---

## Environment Variables

```env
# Required
OPENAI_API_KEY=sk-...
BL_API_KEY=...                    # Blaxel API key
BL_WORKSPACE=...                  # Blaxel workspace name

# Auto-created by `npm run setup`
BL_DRIVE_ID=open-cowork-drive     # Shared drive mounted on both sandboxes
BL_FS_SANDBOX=open-cowork-fs      # Dedicated sandbox for file listing/reading APIs

# Optional (defaults to local file DB)
DATABASE_URL=libsql://...         # Turso URL for production
DATABASE_AUTH_TOKEN=...           # Turso auth token

# Optional
BL_REGION=us-pdx-1                # Blaxel region for sandbox/drive creation
SANDBOX_TTL_DAYS=2                # Days before sandbox cleanup (default: 2)
```

---

## What This Template Teaches

This isn't just a starter — it's a reference for patterns that are hard to find examples of:

1. **assistant-ui `RemoteThreadListRuntime`** — Full multi-thread persistence with `withFormat` message encoding, thread list sidebar, and proper adapter wiring. Most tutorials only cover single-thread.
2. **Cloud sandbox orchestration** — Provisioning, exec, preview proxying, and lifecycle management (TTL, reconnect) with Blaxel.
3. **Tabbed canvas with agent control** — Agent tool calls drive which tab is visible (browser vs files). The UI and the agent cooperate.
4. **File system integration** — Drive mounting, file tree rendering, inline file viewing, and file upload from the chat composer.
5. **libSQL + Drizzle in Next.js** — Works locally with a file, works in production with Turso. Zero native deps, no cold-start issues.
6. **Responsive AI chat layout** — Sidebar drawer, canvas overlay, mobile-first touch targets. Not just "it doesn't break on mobile."

---

## Non-Goals

- **Auth**: Not included. Add NextAuth/Clerk/Auth0 when you need it — there are excellent guides for each.
- **Payments/billing**: Out of scope.
- **Multi-user/teams**: Single-user by default. Add user scoping to the thread queries when you add auth.
- **Monaco editor**: File viewer is read-only syntax-highlighted text. Swap in Monaco if you need editing.
- **Custom LLM hosting**: Uses OpenAI via AI SDK. Swap the model provider in one line.
