// Optional Supabase-backed sync for hosted/chat-only mode (no bridge reachable), configured
// via Settings (Supabase URL + anon key + sync code), same pattern as the Groq key field.
// See supabase/schema.sql for the schema and — importantly — the security tradeoff this
// relies on: there's no login UI, so partitioning is by a plain `sync_code` the user copies
// between devices, not real per-user access control.

const SUPABASE_JS_CDN = 'https://esm.sh/@supabase/supabase-js@2';

function getConfig() {
  return {
    url: localStorage.getItem('aegis_supabase_url') || '',
    anonKey: localStorage.getItem('aegis_supabase_anon_key') || '',
  };
}

export function getSyncCode() {
  let code = localStorage.getItem('aegis_sync_code');
  if (!code) {
    code = crypto.randomUUID();
    localStorage.setItem('aegis_sync_code', code);
  }
  return code;
}

export function setSyncCode(code) {
  if (code) localStorage.setItem('aegis_sync_code', code);
}

let clientPromise = null;

// Resolves to a configured Supabase client, or null if unconfigured/unreachable — callers
// should treat null as "skip this tier", never as an error to surface.
export async function getSupabase() {
  const { url, anonKey } = getConfig();
  if (!url || !anonKey) return null;
  if (!clientPromise) {
    clientPromise = import(/* @vite-ignore */ SUPABASE_JS_CDN)
      .then(({ createClient }) => createClient(url, anonKey))
      .catch((e) => {
        console.warn('Supabase client failed to load:', e.message);
        clientPromise = null;
        return null;
      });
  }
  return clientPromise;
}

export async function rememberFactSupabase(category, key, value) {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const sync_code = getSyncCode();
  const { error } = await supabase
    .from('facts')
    .upsert(
      { sync_code, category: category || 'notes', key, value: String(value), updated_at: new Date().toISOString() },
      { onConflict: 'sync_code,category,key' }
    );
  if (error) throw error;
  return { success: true, message: `Remembered ${category || 'notes'}:${key} (synced)` };
}

export async function recallFactsSupabase(category, query) {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const sync_code = getSyncCode();
  let q = supabase.from('facts').select('category, key, value, updated_at').eq('sync_code', sync_code);
  if (category) q = q.eq('category', category);
  if (query) q = q.or(`key.ilike.%${query}%,value.ilike.%${query}%`);
  const { data, error } = await q.order('updated_at', { ascending: false });
  if (error) throw error;
  return { success: true, facts: data || [] };
}

export async function forgetFactSupabase(category, key) {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const sync_code = getSyncCode();
  const { error } = await supabase.from('facts').delete().eq('sync_code', sync_code).eq('category', category).eq('key', key);
  if (error) throw error;
  return { success: true, message: `Forgot ${category}:${key} (synced)` };
}

export async function summaryFactsSupabase(limit = 15) {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const sync_code = getSyncCode();
  const { data, error } = await supabase
    .from('facts')
    .select('category, key, value')
    .eq('sync_code', sync_code)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((r) => `[${r.category}] ${r.key}: ${r.value}`).join('; ');
}

export async function syncMessage(role, content) {
  const supabase = await getSupabase();
  if (!supabase) return;
  const sync_code = getSyncCode();
  try {
    await supabase.from('messages').insert({ sync_code, role, content });
  } catch (e) {
    console.warn('Supabase message sync failed:', e.message);
  }
}

export async function fetchRecentMessages(limit = 50) {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const sync_code = getSyncCode();
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('sync_code', sync_code)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('Supabase history fetch failed:', e.message);
    return [];
  }
}
