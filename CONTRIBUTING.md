# Contributing to OpenCoDesk

Thanks for your interest in improving this template.

## Development setup

1. Fork and clone the repo
2. `cp .env.example .env.local` and add your API keys
3. `npm install && npm run setup && npm run dev`
4. `npx tsc --noEmit` before opening a PR

## Scope

OpenCoDesk is intentionally a **starter template**, not a full product. Good contributions:

- Bug fixes in sandbox/drive integration
- Clearer docs and setup reliability
- File preview or canvas UX improvements
- Small, focused features that help adopters build similar apps

Out of scope (unless discussed first):

- Full auth / billing / multi-tenant SaaS features
- Large framework migrations

## Pull requests

- Keep PRs focused; one concern per PR when possible
- Match existing code style (TypeScript strict, minimal comments)
- Update README if behavior or env vars change

## Design reference

See the root README for the workspace contract (`/workspace/sessions/...`, `/workspace/memory/`) and display tools (`showFile`, `showBrowser`).
