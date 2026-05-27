# Setup Guide

## Prerequisites

- Node.js 18+
- An OpenAI API key
- A Blaxel account with workspace + API key

## Environment Variables

Create a `.env` file in the `v2/` root:

```bash
cp .env.example .env
```

Then fill in:

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `OPENAI_API_KEY` | ✅ | OpenAI API key for GPT-4o | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `BL_WORKSPACE` | ✅ | Your Blaxel workspace name | [app.blaxel.ai](https://app.blaxel.ai) → Settings → Workspace |
| `BL_API_KEY` | ✅ | Blaxel API key | [app.blaxel.ai](https://app.blaxel.ai) → Settings → API Keys |
| `BL_SANDBOX_TEMPLATE` | ❌ | Sandbox image (default: `blaxel/node-sandbox`) | Leave default unless you need a custom image |
| `BL_REGION` | ❌ | Region (default: `us-pdx-1`) | Options: `us-pdx-1`, `us-west-2`, `eu-west-1` |

## Install & Run

```bash
cd v2
npm install
npm run dev
```

Open http://localhost:3000

## Build for Production

```bash
npm run build
npm start
```

## Troubleshooting

- **"Missing @blaxel/core"** — Ensure `BL_WORKSPACE` and `BL_API_KEY` are set in `.env`
- **Sandbox timeout** — Check your Blaxel workspace has quota. The sandbox must be reachable within 120s.
- **Port 3000 conflict** — Kill existing processes: `npx kill-port 3000`
- **CSS errors about @theme** — Ensure you're on Tailwind CSS v4.2+. The `@theme` block only allows custom properties.
