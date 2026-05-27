# OpenCowork Next UX and Workspace Plan

This doc captures the next direction for OpenCowork. The goal is to make the app feel like a file-centered coworking agent with a predictable workspace, explicit canvas display tools, and lightweight durable memory.

The plan should stay small. The app already has the hard primitives: thread persistence, Blaxel sandbox execution, a shared drive, file upload, a Files tab, and a Browser tab. The next work is mostly about tightening the contract between the agent, workspace, and UI.

## Product Direction

OpenCowork should behave like an agent working in a shared drive with the user.

- User uploads and generated files should land in predictable thread-scoped folders.
- The canvas should be controlled intentionally: show a browser when there is a live preview, show a file when there is a user-facing artifact.
- Durable memory should be a small markdown wiki, not a transcript dump or a complex retrieval system.
- The system prompt should teach the agent this workflow directly.

## Workspace Contract

Use the assistant-ui thread id as the session id for all per-chat paths.

```text
/workspace/
  sessions/
    <threadId>/
      uploads/
      outputs/
      work/
  memory/
    AGENTS.md
    index.md
    log.md
    user.md
    projects/
    entities/
```

### Folder Roles

`/workspace/sessions/<threadId>/uploads/`

Files uploaded by the user in that chat. The attachment adapter should upload here instead of directly into `/workspace`.

`/workspace/sessions/<threadId>/outputs/`

Final user-facing artifacts from that chat: reports, cleaned datasets, charts, exported markdown, generated CSVs, generated app files the user should inspect, etc.

`/workspace/sessions/<threadId>/work/`

Scratch scripts, intermediate files, temporary analysis notebooks, extracted data, and one-off working material.

`/workspace/memory/`

Durable cross-chat knowledge maintained by the agent. This is intentionally simple markdown memory inspired by Karpathy's LLM wiki pattern: raw sources remain source of truth, while the agent maintains concise linked pages for durable knowledge.

Do not add `/workspace/shared`, per-session logs, output manifests, or a separate memory service in this pass. Those can be added later if the product actually needs them.

## Display Tools

Replace the overloaded preview/file-display language with two explicit tools:

```ts
showBrowser()
showFile({
  path: "/workspace/sessions/<threadId>/outputs/report.md"
})
```

### `showBrowser`

Purpose: show the live browser preview.

Expected tool behavior:

- Fetch or return the session preview URL.
- Show the canvas.
- Switch active tab to `browser`.
- Load the preview URL.

Agent rule:

- Call `showBrowser` only after a server is running and readiness has been confirmed.
- Do not call it just because files changed.

Implementation note:

- This can replace or wrap the current `refreshCanvas` behavior. The public tool name should communicate display intent, not internal iframe refresh mechanics.

### `showFile`

Purpose: show a specific drive file to the user.

Expected tool behavior:

- Validate that the requested path is under `/workspace`.
- Show the canvas.
- Switch active tab to `files`.
- Expand folders as needed.
- Select the requested file.
- Load the file content in the file viewer.

Agent rule:

- Call `showFile` after creating or updating a user-facing artifact.
- Prefer showing outputs, not scratch files, unless the user asks to inspect implementation details.

Implementation note:

- `CanvasObserver` should watch for `showFile` tool results.
- `FilesTab` needs an externally requested path prop or event listener so it can expand/select/open the file.

## Canvas UX

### New Chat Behavior

When the user starts a new chat:

- Collapse or hide the canvas.
- Reset active canvas tab to `files`.
- Keep the main thread focused on the empty-state composer.

Implementation note:

- `Shell` owns `canvasVisible` and `activeTab`.
- `HeaderActions` renders the New Chat button.
- Either pass callbacks from `Shell` to `HeaderActions`, or observe active thread changes and reset canvas state when a newly created empty thread becomes active.

### Show Drive Button

Add a `Show Drive` button next to `New Chat` in the main header.

Behavior:

```ts
setCanvasVisible(true);
setActiveTab("files");
```

This gives users a simple way to reopen the drive after the canvas is collapsed.

## Memory Direction

Memory should follow the practical parts of the LLM wiki pattern:

- Keep raw uploaded/session files as source of truth.
- Maintain a small linked markdown wiki for durable knowledge.
- Avoid dumping full conversations into memory.
- Update memory only for durable facts, user preferences, project conventions, ongoing work, stable entities, and reusable context.
- Keep pages concise and link back to session files or outputs when useful.
- Use `index.md` for navigation.
- Use `log.md` as an append-only chronological record of memory updates.

Initial memory files:

```text
/workspace/memory/AGENTS.md
/workspace/memory/index.md
/workspace/memory/log.md
/workspace/memory/user.md
/workspace/memory/projects/
/workspace/memory/entities/
```

### Memory File Roles

`AGENTS.md`

The schema/conventions file for memory maintenance. It should tell the agent what belongs in memory, what does not, page naming conventions, and update workflow.

`index.md`

The memory catalog. It should list important memory pages with short descriptions.

`log.md`

Append-only timeline of memory updates. Use parseable headings:

```md
## [YYYY-MM-DD] memory | Short description
```

`user.md`

Stable user preferences and reusable context.

`projects/`

Durable notes about ongoing projects.

`entities/`

Reusable notes about important people, companies, tools, datasets, or concepts.

Do not add embeddings, vector search, or a dedicated memory update tool yet. The agent can maintain memory by reading/writing markdown files with `exec`.

## System Prompt Updates

The current chat prompt is still too close to a generic coding sandbox assistant. Update it around OpenCowork's file workflow.

The prompt should include:

- Always call `provisionSandbox` before reading or writing drive files.
- Treat the current thread id as the workspace session id.
- Ensure these directories exist before working:
  - `/workspace/sessions/<threadId>/uploads/`
  - `/workspace/sessions/<threadId>/outputs/`
  - `/workspace/sessions/<threadId>/work/`
  - `/workspace/memory/`
- Treat `/workspace/sessions/<threadId>/uploads/` as user-provided input.
- Write final deliverables to `/workspace/sessions/<threadId>/outputs/`.
- Use `/workspace/sessions/<threadId>/work/` for scratch scripts and intermediate files.
- Use `showFile` after creating or updating a user-facing artifact.
- Use `showBrowser` only after a live preview server is running and readiness has been confirmed.
- Maintain `/workspace/memory/` only for durable reusable knowledge.
- Do not dump raw chat transcripts into memory.
- When memory is relevant, read `/workspace/memory/AGENTS.md` and `/workspace/memory/index.md` first.
- When memory changes, update `index.md` if needed and append a short entry to `log.md`.

The prompt should also stop telling the agent that every task is a coding project. It should support analysis, file processing, report generation, data cleanup, app generation, and general workspace tasks.

## Implementation Order

1. Workspace folder contract
   - Update upload path to `/workspace/sessions/<threadId>/uploads/`.
   - Ensure provisioning creates `uploads`, `outputs`, and `work` for the current thread.
   - Ensure initial memory files/folders exist.
   - Keep the file APIs rooted at `/workspace`.

2. Display tools
   - Rename or replace `refreshCanvas` with `showBrowser`.
   - Add `showFile({ path })`.
   - Wire `CanvasObserver` for both tools.
   - Teach `FilesTab` to expand/select/open an externally requested file path.

3. Canvas controls
   - Add `Show Drive` button.
   - Collapse/reset canvas on new chat.
   - Verify `showBrowser` focuses Browser and `showFile` focuses Files.

4. Prompt update
   - Rewrite the system prompt around the workspace contract, display tools, and memory rules.
   - Include the current thread/session path explicitly.
   - Update starter suggestions so they reference session outputs/work folders, not flat `/workspace/outputs`.

5. Memory seed
   - Create minimal `AGENTS.md`, `index.md`, `log.md`, and `user.md` content.
   - Keep the schema short enough that the agent will actually follow it.
   - Defer advanced memory tooling until the markdown workflow proves useful.

## Deferred

- `/workspace/shared`
- `/workspace/sessions/<threadId>/logs`
- output manifests
- rich file cards in chat
- vector search or embeddings for memory
- dedicated memory update tools
- automatic memory updates without prompt conventions

## Open Questions

- Should `showFile` support only readable text-like files initially, or should it also handle images/PDFs with specialized viewers?
- Should memory updates be agent-initiated by default, or should the agent ask before recording personal/user facts?
- Should old flat `/workspace` files be migrated, ignored, or left visible as legacy root files?
