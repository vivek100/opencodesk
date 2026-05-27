/**
 * Seed content for the /workspace/memory/ markdown wiki.
 * Written by provisionSandbox on first run if files don't already exist.
 */

export const MEMORY_SEED: Record<string, string> = {
  "AGENTS.md": `# Memory Conventions

This folder is a lightweight markdown wiki for durable knowledge that persists across chat sessions.

## What belongs here
- User preferences and reusable context
- Ongoing project notes and conventions
- Important entities (people, companies, tools, datasets)
- Stable facts worth remembering across sessions

## What does NOT belong here
- Raw chat transcripts or conversation logs
- Temporary analysis results (those go in session outputs)
- Duplicate copies of uploaded files

## Update workflow
1. Read index.md to see what pages exist
2. Create or update the relevant page
3. Update index.md if you added a new page
4. Append a short entry to log.md

## Page naming
- Use lowercase kebab-case for filenames
- Put project notes in projects/
- Put entity notes in entities/
`,

  "index.md": `# Memory Index

Pages in this wiki:

- [user.md](user.md) — User preferences and context
- [AGENTS.md](AGENTS.md) — Memory conventions and update rules
- [log.md](log.md) — Chronological record of memory updates
`,

  "log.md": `# Memory Log

Chronological record of memory updates. Use this format:

## [YYYY-MM-DD] memory | Short description
`,

  "user.md": `# User Profile

Preferences, conventions, and reusable context about the user.
`,
};
