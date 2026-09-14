# MINO — Instrument Console

MINO (formerly JARVIS, then AEGIS) is a bilingual (English + Kiswahili), voice-driven AI assistant with a real system-control backend: it can chat, open apps, search and play music, type into any focused window, press keys, run shell commands, and control your PC's power state (shutdown/restart/sleep/lock) — all through a local Python bridge.

There are two ways to run it, and they share the same code:

| Mode | Entry point | What works |
|---|---|---|
| **Local (full control)** | `python dev_server.py` → serves `aegis_standalone.html` | Everything: chat, wake-word voice, real power control, volume, YouTube search+play, live CPU/RAM/disk vitals. |
| **Hosted (chat-only)** | `npm run dev` locally, or deployed to Vercel → serves `index.html` | Chat and wake-word voice work standalone (talks to Groq directly, no bridge needed). PC-control panels (vitals, power, media) automatically hide themselves when no bridge is reachable — see **Chat-only mode** below. |

## Quick Start (full control, on this PC)

1. Install Python dependencies once:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the bridge:
   ```bash
   python dev_server.py
   ```
3. Open the address printed in the terminal — **use `http://localhost:5001` on this PC** (browsers only allow microphone access on secure origins, and localhost is the one allowed over HTTP; the LAN address like `http://192.168.0.196:5001` is for your phone, which can chat and control the PC but cannot use the mic). Click **INITIALIZE MINO**.
4. API keys (pick either style, per key):
   - **Zero-config (recommended on this PC):** drop keys into git-ignored local files next to `dev_server.py` and they're injected automatically:
     - `groq_key.local` — one line: your Groq key.
     - `elevenlabs_key.local` — line 1: ElevenLabs API key, line 2: voice ID. (The bundled voice ID is the account-owned "SWAHILI MAN" voice, usable on the free plan; the "Robert" voice `BtWabtumIemAotTjP5sk` requires a paid ElevenLabs plan — swap it in after upgrading and MINO will use it, with automatic fallback otherwise.)
   - **Manual:** open **⚙ Settings** (top right), paste a free Groq API key from [console.groq.com](https://console.groq.com), click **Save**.
5. Optional — install MINO like a desktop app:
   ```bash
   powershell -ExecutionPolicy Bypass -File scripts\install_mino.ps1            # Start Menu shortcut
   powershell -ExecutionPolicy Bypass -File scripts\install_mino.ps1 -Startup   # + launch at login
   ```
   This creates a **MINO** entry in the Start Menu that starts the bridge and opens the HUD as an app-style window (no browser chrome) on `http://localhost:5001`.

Say *"Mino, lock my PC"* (or *"Mino, fungua YouTube"* in Kiswahili) or click the shield icon to arm hands-free wake-word listening.

## Chat-only mode (Vercel / phone)

MINO is meant to run on your own PC for real PC control — that part can't exist on a hosted platform like Vercel, since there's nothing for it to control there. When no bridge is reachable, the app automatically drops into **chat-only mode**: the Vitals, Media, Power, System Log, and Active Tasks panels hide themselves, leaving just the presence dial, chat, and Quick Launch (which just opens URLs, no PC needed). A note at the bottom of the page confirms you're in this mode.

To deploy the chat-only build to Vercel:

```bash
npm install
vercel login      # one-time, opens a browser to authenticate
vercel --prod
```

`vercel.json` is already configured (`npm run build` → `dist/`, Vite framework preset). Once deployed, opening the Vercel URL from your phone gives you the chat/voice AI experience anywhere — just open Settings and paste your Groq key on that device too (the key lives in that browser's local storage, not on a server).

If you *do* want your phone to control your PC remotely, the bridge would need to be reachable from the phone — either the same Wi-Fi network (enter your PC's LAN address in Settings → Local Bridge URL), or a public tunnel (e.g. `ngrok http 5001`). That's a real exposure of local system control to the network, so only do it deliberately.

## Features

- **Real system control**: file management, app launch/close, browser open, and power control (shutdown/restart/sleep have a genuine, cancellable 10-second OS-level delay; lock is instant) — all via `dev_server.py`.
- **Wake-word voice**: arm the shield toggle for hands-free "Mino, …" activation; the mic button is push-to-talk.
- **Bilingual**: speaks English and Kiswahili — it detects the Boss's language and replies in kind (Whisper transcribes voice commands in either language; Kiswahili replies use the browser's speech engine).
- **Types and controls apps**: can type into any focused window (chat apps, forms, editors), press keys, and run shell commands — near-total PC access.
- **Spoken replies**: voice chain — ElevenLabs (the Boss's own multilingual voice) → Groq TTS (English) → browser speechSynthesis, toggleable.
- **Music**: the `play_music` tool searches YouTube and plays it embedded, with real volume control.
- **Live vitals**: CPU, memory, and disk usage polled from the bridge every 5 seconds (local mode only).

## Technical Details

- **Frontend**: self-contained HTML/CSS/JS, no framework or CDN dependencies at runtime (custom canvas-drawn presence dial, system fonts only). `aegis_standalone.html` (local) and `index.html` (hosted) both import their engine from `src/shared/` — one shared implementation, not two copies.
- **AI**: browser calls Groq directly — works with or without a bridge. Uses native Groq tool/function-calling (`src/shared/groqAgent.js` + `toolSchemas.js`/`toolExecutors.js`) to take real action, not text-parsed commands. Model routing: `openai/gpt-oss-120b` (with native reasoning) handles complex, analytical, or multi-step turns; `openai/gpt-oss-20b` handles short casual turns for lower latency. The system prompt carries the Boss's local date/time, live system context, and a memory summary.
- **Groq key**: resolved in order — Settings panel (localStorage) → `window.AEGIS_GROQ_KEY` (injected by the bridge from the git-ignored `groq_key.local`) → `VITE_GROQ_API_KEY` build-time env (`.env.local` locally, or a Vercel project env var for hosted builds). API keys are never committed to the repo.
- **Bridge**: `dev_server.py`, Python stdlib `http.server` + `psutil`/`pycaw`/`comtypes` (Windows). Port `5001` by default.
- **Security policy**: loopback addresses are rejected everywhere by design — always use a real hostname or LAN IP.

---
*MINO online. Standing by, Boss.*
