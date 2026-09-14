// Browser shim for running shared modules under Node.
import { readFileSync } from 'node:fs';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.window = globalThis;
try {
  globalThis.AEGIS_GROQ_KEY = readFileSync('groq_key.local', 'utf-8').trim();
} catch {
  globalThis.AEGIS_GROQ_KEY = '';
}
