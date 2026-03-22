# Sophia Workspace 🦉

A voice-enabled workspace for collaborating with Sophia (OpenClaw AI assistant).

## Features

### Desktop (3-pane layout)
- **Three resizable panes** with drag handles:
  - **Left (Workspace)**: The main deliverable - code, documents, whatever we're building
  - **Middle (Scratchpad)**: Research, notes, images, context
  - **Right (Dialogue)**: Voice + text conversation with full transcript

### Mobile (tab-based layout)
- **Three tabs**: Chat, Workspace, Notes
- **Blue dot indicators** when panes have new content
- **iOS safe area** support (notch, home indicator)
- **Add to Home Screen** for app-like experience

### Both
- **Voice input** via OpenAI Whisper speech-to-text
- **Voice output** via OpenAI TTS with Shimmer voice (toggle on/off)
- **Text input** for when voice isn't convenient
- **Markdown rendering** with syntax highlighting for code
- **Session persistence** - conversation saved to localStorage
- **Connection status** indicator in header
- **Clear conversation** button

## Tech Stack

- Next.js 16 (App Router)
- OpenAI Whisper (speech-to-text)
- OpenAI TTS with Shimmer voice
- OpenClaw Gateway (chat backend)
- Tailwind CSS
- react-markdown with remark-gfm
- react-syntax-highlighter

## Quick Start

```bash
cd /Users/openclaw/.openclaw/workspace/projects/sophia-workspace
npm run dev
# Open http://localhost:3000
```

## Deploy to Vercel

See [DEPLOY.md](./DEPLOY.md) for full instructions.

Quick version:
```bash
npx vercel login
npx vercel --prod
# Add environment variables in Vercel dashboard
```

## Usage

### Desktop
1. Click the microphone or type in the text box
2. I respond with voice (if enabled) and can update the workspace/scratchpad
3. Drag the dividers to resize panes
4. Click speaker icon to toggle voice responses
5. Click trash icon to clear conversation

### Mobile
1. Open in Safari on iPhone
2. Tap Share → Add to Home Screen for best experience
3. Use tabs to switch between Chat, Workspace, and Notes
4. Blue dots appear on tabs when content updates

### Pane Content Markers

I update the workspace and scratchpad using markers in my response:

```
[[WORKSPACE]]
Your code or document here
[[/WORKSPACE]]

[[SCRATCHPAD]]
Research notes here
[[/SCRATCHPAD]]
```

## License

MIT
