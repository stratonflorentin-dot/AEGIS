// Shared bridge client — used by both aegis_standalone.html (local full-control mode)
// and index.html (hosted/chat-only mode). Security policy: loopback addresses are
// rejected everywhere by design (see PROJECT_AUDIT.md / README "Security policy").

export function getStoredKey(newKey, oldKey) {
  const val = localStorage.getItem(newKey);
  if (val !== null) return val;
  const legacy = localStorage.getItem(oldKey);
  if (legacy !== null) {
    localStorage.setItem(newKey, legacy);
    localStorage.removeItem(oldKey);
  }
  return legacy;
}

// Groq API key resolution order:
// 1. Settings panel (localStorage) — what the Boss typed, always wins.
// 2. window.AEGIS_GROQ_KEY — injected by dev_server.py when serving the local HUD,
//    read from the git-ignored groq_key.local file (never leaves the LAN bridge).
// 3. VITE_GROQ_API_KEY build-time env (Vite path only; undefined when served raw
//    by the Python bridge, where the optional chain safely falls through).
export function resolveGroqKey() {
  return (
    getStoredKey('aegis_groq_key', 'jarvis_groq_key') ||
    window.AEGIS_GROQ_KEY ||
    import.meta.env?.VITE_GROQ_API_KEY ||
    ''
  );
}

// ElevenLabs voice credentials, same resolution order as the Groq key:
// Settings (localStorage) → bridge-injected window globals (from the git-ignored
// elevenlabs_key.local) → Vite build-time env.
export function resolveElevenLabs() {
  return {
    apiKey:
      getStoredKey('aegis_elevenlabs_key', 'elevenlabs_key') ||
      window.AEGIS_ELEVENLABS_KEY ||
      import.meta.env?.VITE_ELEVENLABS_API_KEY ||
      '',
    voiceId:
      getStoredKey('aegis_elevenlabs_voice', 'elevenlabs_voice') ||
      window.AEGIS_ELEVENLABS_VOICE ||
      import.meta.env?.VITE_ELEVENLABS_VOICE_ID ||
      '',
  };
}

export function isLocalhost(host) {
  return ['localhost', '127.0.0.1', '[::1]', '::1'].some((f) => host.toLowerCase().includes(f));
}

export function validateUrl(url) {
  if (!url) return true;
  const parsed = new URL(url.startsWith('http') ? url : `http://${url}`);
  if (isLocalhost(parsed.hostname)) {
    throw new Error(`SECURITY POLICY VIOLATION: '${parsed.hostname}' is a prohibited loopback target.`);
  }
  return true;
}

export function getEnvConfig() {
  const hostname = window.location.hostname;
  const storedBridge = getStoredKey('aegis_bridge_url', 'jarvis_bridge_url');
  if (storedBridge) {
    try {
      validateUrl(storedBridge);
    } catch (e) {
      console.error(e.message);
      localStorage.removeItem('aegis_bridge_url');
    }
  }
  const defaultBridge = window.location.origin;
  return {
    BRIDGE_URL: getStoredKey('aegis_bridge_url', 'jarvis_bridge_url') || defaultBridge,
    IS_LOCAL: hostname !== 'aegis-hud-example.vercel.app',
  };
}

// Tries the current page origin first (works when the bridge itself served this page),
// then falls back to the configured BRIDGE_URL (works from a phone / hosted deployment).
export async function aegisFetch(path, options) {
  const config = getEnvConfig();
  let bridgeReached = false;
  let lastError = null;
  try {
    validateUrl(config.BRIDGE_URL);
  } catch (e) {
    throw new Error(`Neural link offline: ${e.message}`);
  }

  try {
    const response = await fetch(path, options);
    if (response.ok) return response;
    if (response.status === 404) bridgeReached = true;
    if (response.status !== 404 && response.status !== 0) return response;
  } catch (e) {
    lastError = e;
  }

  try {
    const localUrl = `${config.BRIDGE_URL.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await fetch(localUrl, options);
    if (res.ok) return res;
    if (res.status === 404) bridgeReached = true;
    if (res.status !== 0) return res;
  } catch (e) {
    lastError = e;
  }

  if (bridgeReached) {
    const err = new Error(`Interface route '${path}' not found on any bridge.`);
    err.status = 404;
    throw err;
  }
  const errorMsg = lastError ? lastError.message : 'Connection refused or blocked by browser security.';
  const offlineErr = new Error(`Neural link offline: ${errorMsg}`);
  offlineErr.status = 0;
  throw offlineErr;
}

export async function postJSON(path, body) {
  const res = await aegisFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}
