# Sophia Workspace - Deployment Guide

## Option 1: Quick Deploy (Terminal)

Run these commands on your Mac mini:

```bash
cd /Users/openclaw/.openclaw/workspace/projects/sophia-workspace

# Login to Vercel (opens browser)
npx vercel login

# Deploy to production
npx vercel --prod
```

When prompted:
- Set up and deploy? **Y**
- Scope: Choose your account
- Link to existing project? **N**
- Project name: **sophia-workspace**
- Directory: **.** (current)

After deploy, add environment variables:

```bash
npx vercel env add OPENAI_API_KEY production
# Paste: YOUR_OPENAI_API_KEY

npx vercel env add GATEWAY_URL production
# Paste: https://peters-mac-mini.tail382f8f.ts.net

npx vercel env add GATEWAY_TOKEN production
# Paste: c1a50d2f62492306baafe1f6f582ff55fbabed4355e7a75f

# Redeploy with env vars
npx vercel --prod
```

## Option 2: Test Locally First

```bash
cd /Users/openclaw/.openclaw/workspace/projects/sophia-workspace
npm run dev
# Open http://localhost:3000
```

## Features

- **Left pane**: Workspace - the main deliverable we're working on
- **Middle pane**: Scratchpad - research, notes, images
- **Right pane**: Dialogue - our conversation (voice + text)
- **Drag handles**: Resize any pane by dragging the dividers
- **Voice toggle**: Speaker icon to enable/disable audio responses
- **Text input**: Type when voice isn't convenient

## How I Update the Panes

I can push content to the workspace and scratchpad panes using special markers:

```
[[WORKSPACE]]
Your code or document here
[[/WORKSPACE]]

[[SCRATCHPAD]]
My research notes here
[[/SCRATCHPAD]]
```

## Requirements

- Gateway must be running on your Mac mini
- Tailscale Funnel must be enabled (it is)
- Microphone permission for voice input
