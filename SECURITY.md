# Security Policy

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security-sensitive reports.

Email or DM the maintainers with:

- Description of the issue
- Steps to reproduce
- Impact assessment

We will respond as soon as we can.

## Secrets

- Never commit `.env.local` or real API keys
- Use `.env.example` for documentation only
- Rotate keys immediately if they are exposed in a commit or log

## Template limitations

This project runs arbitrary shell commands in cloud sandboxes via the LLM. Deploy only in environments you trust, with appropriate API key restrictions and sandbox policies.
