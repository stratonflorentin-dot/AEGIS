// Optional Supabase tier — intentionally stubbed out in the local/desktop build.
// MINO's memory is bridge-authoritative (dev_server.py /memory) with a localStorage
// last resort; nothing in this build provisions Supabase. The stub returns null so
// memoryClient's optional middle tier silently falls through.
export async function rememberFactSupabase() {
  return null;
}
export async function recallFactsSupabase() {
  return null;
}
export async function forgetFactSupabase() {
  return null;
}
export async function summaryFactsSupabase() {
  return null;
}
