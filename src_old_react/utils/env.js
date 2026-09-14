export const getBridgeUrl = () => {
  // Check if we're in a Vite environment
  const env = import.meta.env || {};
  
  // 1. Check for explicit environment variable override
  if (env.VITE_BRIDGE_URL) {
    return env.VITE_BRIDGE_URL;
  }

  // 2. Deployment detection
  const hostname = window.location.hostname;
  const isVercel = hostname.includes('vercel.app');
                  
  if (!isVercel) {
    // For local network development, use the current hostname (e.g., aegis.local or IP)
    return `http://${hostname}:5001`;
  }
  
  // 3. Vercel deployment detection
  const vercelUrl = env.VITE_VERCEL_URL || hostname;
  if (vercelUrl) {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${vercelUrl}`;
  }

  // 4. Fallback to current origin
  return window.location.origin;
};
