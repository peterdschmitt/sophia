# Sophia Workspace

A voice-enabled three-pane workspace for collaborating with Sophia (OpenClaw AI assistant).

## Features

- **Left Pane (Workspace)**: The main deliverable - code, documents, whatever we're building together
- **Middle Pane (Scratchpad)**: Research, notes, images, supporting material
- **Right Pane (Dialogue)**: Voice-enabled conversation with full transcript

All panes are resizable with drag handles.

## Tech Stack

- Next.js 14 (App Router)
- OpenAI Whisper (speech-to-text)
- OpenAI TTS with Shimmer voice (text-to-speech)
- OpenClaw Gateway (chat backend)
- Tailwind CSS

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env.local`
3. Fill in your API keys:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `GATEWAY_URL`: Your OpenClaw gateway URL
   - `GATEWAY_TOKEN`: Your gateway authentication token

```bash
npm install
npm run dev
```

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/sophia-workspace)

Set the environment variables in Vercel:
- `OPENAI_API_KEY`
- `GATEWAY_URL`
- `GATEWAY_TOKEN`

## Usage

1. Click the microphone button to start recording
2. Speak your message
3. Click again to stop and send
4. Sophia will respond with voice (auto-plays) and update the panes if needed

### Pane Content Markers

Sophia can update the workspace and scratchpad panes by including special markers in her response:

```
[[WORKSPACE]]
code or content here
[[/WORKSPACE]]

[[SCRATCHPAD]]
research notes here
[[/SCRATCHPAD]]
```

## License

MIT
