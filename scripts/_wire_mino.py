import io
import re

# 1) Types that lived in anthropic.ts move to groq.ts.
for fname in ['src/lib/brain.ts', 'src/lib/bridge.ts']:
    with io.open(fname, encoding='utf-8') as f:
        src = f.read()
    src = src.replace("from './anthropic'", "from './groq'")
    with io.open(fname, 'w', encoding='utf-8', newline='') as f:
        f.write(src)
    print(fname, ': type import -> groq')

# 2) config.ts: add the Groq key to env.
fname = 'src/config.ts'
with io.open(fname, encoding='utf-8') as f:
    src = f.read()
src = src.replace(
    "  anthropicKey: str(import.meta.env.VITE_ANTHROPIC_API_KEY) ?? '',",
    "  anthropicKey: str(import.meta.env.VITE_ANTHROPIC_API_KEY) ?? '',\n  groqKey: str(import.meta.env.VITE_GROQ_API_KEY) ?? '',",
)
with io.open(fname, 'w', encoding='utf-8', newline='') as f:
    f.write(src)
print('config.ts : groqKey added')

# 3) App.tsx: direct-mode key check -> Groq key.
fname = 'src/App.tsx'
with io.open(fname, encoding='utf-8') as f:
    src = f.read()
src = src.replace(
    """    if (!usingBridge && !env.anthropicKey) {
      s.setError(
        'No Anthropic API key — copy .env.example to .env.local and set VITE_ANTHROPIC_API_KEY.',
      )
    }""",
    """    if (!usingBridge && !env.groqKey) {
      s.setError(
        'No Groq API key — copy .env.local and set VITE_GROQ_API_KEY (free key at console.groq.com).',
      )
    }""",
)
# 4) App.tsx: the model name shown during boot/voice phases.
src = re.sub(r'claude[^\s"\']*', 'mino', src)  # cosmetic only in comments/labels
with io.open(fname, 'w', encoding='utf-8', newline='') as f:
    f.write(src)
print('App.tsx : key check -> groq')

# 5) voice.ts: wake word + barge-in list -> MINO.
fname = 'src/lib/voice.ts'
with io.open(fname, encoding='utf-8') as f:
    src = f.read()
src = src.replace(
    r"  /\b(?:hey|hi|ok|okay|yo)?\s*(?:jarvis|jarvys|jervis|jarvis's|travis|jarviss|java's|jarv)\b(?!'s)/i",
    r"  /\b(?:hey|hi|ok|okay|yo)?\s*(?:mino|minos|meeno|my no|mino's|know me|mine o)\b(?!'s)/i",
)
src = src.replace(
    r"  /\b(stop|wait|jarvis|cancel|enough|quiet|hold on|shut up|never ?mind|forget it|no)\b/i",
    r"  /\b(stop|wait|mino|cancel|enough|quiet|hold on|shut up|never ?mind|forget it|no)\b/i",
)
with io.open(fname, 'w', encoding='utf-8', newline='') as f:
    f.write(src)
print('voice.ts : wake word -> mino (replacements:', 'jarvis' not in src.replace('hey mino',''), ')')

# 6) tts.ts: multilingual model so Kiswahili speaks properly.
fname = 'src/lib/tts.ts'
with io.open(fname, encoding='utf-8') as f:
    src = f.read()
src = src.replace("model_id: 'eleven_flash_v2_5'", "model_id: 'eleven_multilingual_v2'")
with io.open(fname, 'w', encoding='utf-8', newline='') as f:
    f.write(src)
print('tts.ts : eleven_multilingual_v2')

# 7) fillers.ts: persona word.
fname = 'src/lib/fillers.ts'
with io.open(fname, encoding='utf-8') as f:
    src = f.read()
n = src.count('sir')
src = src.replace("'sir'", "'Boss'").replace('sir,', 'Boss,').replace('sir.', 'Boss.')
with io.open(fname, 'w', encoding='utf-8', newline='') as f:
    f.write(src)
print('fillers.ts : sir->Boss x', n)

# 8) index.html: branding + title.
fname = 'index.html'
with io.open(fname, encoding='utf-8') as f:
    src = f.read()
src = src.replace('<title>J.A.R.V.I.S.</title>', '<title>M.I.N.O.</title>')
src = src.replace('[jarvis] comments preserved', '')
with io.open(fname, 'w', encoding='utf-8', newline='') as f:
    f.write(src)
print('index.html : title -> M.I.N.O.')

# 9) vite.config.ts: proxy bridge endpoints in dev so tool calls reach :5001.
fname = 'vite.config.ts'
with io.open(fname, encoding='utf-8') as f:
    src = f.read()
proxy_lines = ',\n'.join(
    f"      '/{ep}': 'http://localhost:5001'"
    for ep in ['execute', 'system', 'media', 'memory', 'web_search', 'fetch_url',
               'screenshot', 'clipboard', 'type_text', 'press_key', 'window',
               'reminders', 'weather', 'file_search', 'brightness', 'ocr', 'search']
)
src = src.replace(
    "    port: Number(process.env.PORT) || 5173,\n  },",
    "    port: Number(process.env.PORT) || 5173,\n    // Tool calls are same-origin; in dev the app runs on 5173 while the PC\n    // bridge runs on 5001, so proxy the bridge endpoints across.\n    proxy: {\n" + proxy_lines + ",\n    },\n  },",
)
with io.open(fname, 'w', encoding='utf-8', newline='') as f:
    f.write(src)
print('vite.config.ts : dev proxy added')
