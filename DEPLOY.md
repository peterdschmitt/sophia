# Deployment Instructions

## Quick Deploy to Vercel

1. **Login to Vercel CLI:**
   ```bash
   cd /Users/openclaw/.openclaw/workspace/projects/sophia-workspace
   npx vercel login
   ```
   Visit the URL shown and authenticate.

2. **Deploy:**
   ```bash
   npx vercel --prod
   ```
   Follow the prompts (accept defaults).

3. **Set Environment Variables in Vercel Dashboard:**
   - Go to your project at vercel.com
   - Settings → Environment Variables
   - Add these:
     - `OPENAI_API_KEY` = `YOUR_OPENAI_API_KEY`
     - `GATEWAY_URL` = `https://peters-mac-mini.tail382f8f.ts.net`
     - `GATEWAY_TOKEN` = `c1a50d2f62492306baafe1f6f582ff55fbabed4355e7a75f`

4. **Redeploy to pick up env vars:**
   ```bash
   npx vercel --prod
   ```

## Local Testing

```bash
npm run dev
# Open http://localhost:3000
```

## Notes

- The gateway must be accessible from Vercel's servers (Tailscale Funnel handles this)
- Voice features require microphone permission
- Works best in Chrome or Safari
