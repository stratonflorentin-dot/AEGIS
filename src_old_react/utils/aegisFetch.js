
import { getBridgeUrl } from './env';

function isLocalhost(host) {
  return ['localhost', '127.0.0.1', '[::1]', '::1'].some(f => host.toLowerCase().includes(f));
}

function validateUrl(url) {
  if (!url) return true;
  const parsed = new URL(url.startsWith('http') ? url : `http://${url}`);
  if (isLocalhost(parsed.hostname)) {
    throw new Error(`SECURITY POLICY VIOLATION: '${parsed.hostname}' is a prohibited loopback target.`);
  }
  return true;
}

function getStoredKey(newKey, oldKey) {
  const val = localStorage.getItem(newKey);
  if (val !== null) return val;
  const legacy = localStorage.getItem(oldKey);
  if (legacy !== null) {
    localStorage.setItem(newKey, legacy);
    localStorage.removeItem(oldKey);
  }
  return legacy;
}

function getEnvConfig() {
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
  const defaultBridge = getBridgeUrl();
  return {
    BRIDGE_URL: getStoredKey('aegis_bridge_url', 'jarvis_bridge_url') || defaultBridge,
    IS_LOCAL: hostname !== 'aegis-hud-example.vercel.app',
  };
}

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
