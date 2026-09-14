import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Honour PORT so a second instance can run alongside the first. The bridge
    // only accepts sockets from localhost:5173-5199, so stay inside that range
    // or set JARVIS_ALLOWED_ORIGINS to match.
    port: Number(process.env.PORT) || 5173,
    // Tool calls are same-origin; in dev the app runs on 5173 while the PC
    // bridge runs on 5001, so proxy the bridge endpoints across.
    proxy: {
      '/execute': 'http://localhost:5001',
      '/system': 'http://localhost:5001',
      '/media': 'http://localhost:5001',
      '/memory': 'http://localhost:5001',
      '/web_search': 'http://localhost:5001',
      '/fetch_url': 'http://localhost:5001',
      '/screenshot': 'http://localhost:5001',
      '/clipboard': 'http://localhost:5001',
      '/type_text': 'http://localhost:5001',
      '/press_key': 'http://localhost:5001',
      '/window': 'http://localhost:5001',
      '/reminders': 'http://localhost:5001',
      '/weather': 'http://localhost:5001',
      '/file_search': 'http://localhost:5001',
      '/brightness': 'http://localhost:5001',
      '/ocr': 'http://localhost:5001',
      '/search': 'http://localhost:5001',
    },
  },
  optimizeDeps: {
    // kokoro-js pulls in `phonemizer`, which carries espeak-ng as inline WASM.
    // Vite's dependency pre-bundler rewrites that initialisation and the
    // language table ends up empty — the symptom is
    // `Invalid language identifier: "en". Should be one of: .` at generate()
    // time, long after the model has loaded successfully. Serving these
    // untouched fixes it.
    exclude: ['kokoro-js', 'phonemizer', '@huggingface/transformers'],
  },
})
