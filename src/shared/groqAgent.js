// Native Groq tool-calling agentic loop — runs entirely client-side: the browser talks
// to api.groq.com directly (dev_server.py's /proxy exists as a CORS escape hatch but is
// unused here because direct calls already work).
//
// Model routing (models available on current Groq accounts — llama-3.3-70b-versatile was
// retired upstream): openai/gpt-oss-120b is the primary brain (strong reasoning + reliable
// native tool-calling), openai/gpt-oss-20b handles short casual turns to keep latency low
// and conserve the 120b token budget. Both are reasoning models; reasoning tokens count
// against max_tokens, so the cap is generous and reasoning_effort is tuned per route.
// Groq occasionally emits a malformed pseudo-XML function call (error code
// `tool_use_failed`) under large tool schemas — the retry/tools-drop fallback below
// (keyed on the error code, not message text, so it catches every phrasing Groq uses)
// absorbs the occasional bad generation.
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const FAST_MODEL = 'openai/gpt-oss-20b';

// Complexity cues for routing to the 120b brain. Short casual chat ("thanks", "open
// youtube") routes to the fast model; anything analytical, multi-step, or code/math
// related gets the full brain.
const COMPLEXITY_RE =
  /\b(why|how (come|do|does|can|would|should)|explain|analyz|compar|design|plan|strategy|debug|refactor|optimi[sz]|architect|trade-?offs?|pros and cons|step by step|calculate|solve|equation|prove|write.*(code|script|function|essay|email|letter|report)|code|script|function|algorithm|summar.{0,10}(file|page|article|document)|research)\b/i;

export function pickModel(userMessage) {
  const text = (userMessage || '').trim();
  if (!text) return FAST_MODEL;
  // Long messages almost always carry enough context to deserve the big brain.
  if (text.length > 240) return DEFAULT_MODEL;
  if (COMPLEXITY_RE.test(text)) return DEFAULT_MODEL;
  return FAST_MODEL;
}

async function callGroq({ apiKey, model, messages, tools, toolChoice, timeoutMs }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0.7,
        reasoning_effort: model === DEFAULT_MODEL ? 'medium' : 'low',
        messages,
        ...(tools && tools.length ? { tools, tool_choice: toolChoice || 'auto' } : {}),
      }),
    });
    return { response };
  } catch (error) {
    return { error };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function runAgentLoop({
  apiKey,
  model,
  systemPrompt,
  history = [],
  userMessage,
  tools = [],
  executeTool = {},
  maxIterations = 6,
  timeoutMs = 25000,
}) {
  // Route per-turn: the caller can still pin a model explicitly.
  const activeModel = model || pickModel(userMessage);
  const messages = [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userMessage }];

  for (let i = 0; i < maxIterations; i++) {
    // Retry policy for Groq's `tool_use_failed` (malformed function-call generation):
    // retry once with tools, then fall back to a tools-free call so the Boss always
    // gets a real reply, never raw API error text.
    let response;
    let useTools = tools;
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await callGroq({ apiKey, model: activeModel, messages, tools: useTools, timeoutMs });
      if (result.error) {
        if (result.error.name === 'AbortError') return { text: 'Neural bridge timeout, Boss. Groq took too long to respond.' };
        return { text: `Neural link offline, Boss. I can't reach Groq. Diagnostics: ${result.error.message}` };
      }
      response = result.response;
      if (response.ok) break;

      const errData = await response.json().catch(() => ({}));
      if (response.status === 401) return { text: 'Boss, that Groq API key was rejected. Check it in Settings.' };
      // Free-tier TPM limits (8000/min) trip easily mid-loop: wait out the suggested
      // backoff and retry once before giving up with a clean persona message.
      if (response.status === 429 && attempt < 2) {
        const retryMatch = String(errData.error?.message || '').match(/try again in ([\d.]+)s/i);
        const waitS = retryMatch ? Math.min(parseFloat(retryMatch[1]) + 0.5, 30) : 12;
        await new Promise((r) => setTimeout(r, waitS * 1000));
        continue;
      }
      if (errData.error?.code === 'tool_use_failed' && attempt < 2) {
        useTools = attempt === 0 ? tools : []; // 2nd retry drops tools entirely
        continue;
      }
      if (response.status === 429) return { text: "Boss, Groq's free-tier rate limit just caught up with us — give it a minute and try again." };
      return { text: `Neural link disruption, Boss. Error Code: ${response.status}. Details: ${errData.error?.message || 'Unknown'}` };
    }

    const data = await response.json();
    const message = data.choices[0].message;

    if (message.tool_calls && message.tool_calls.length) {
      // Strip the reasoning trace when feeding the assistant turn back — only the
      // content and tool_calls belong in the conversation history.
      messages.push({ role: 'assistant', content: message.content || null, tool_calls: message.tool_calls });
      for (const call of message.tool_calls) {
        let result;
        try {
          const args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
          const executor = executeTool[call.function.name];
          result = executor ? await executor(args) : { success: false, message: `Unknown tool "${call.function.name}".` };
        } catch (e) {
          result = { success: false, message: e.message };
        }
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
      continue;
    }

    return { text: message.content, model: activeModel };
  }

  return { text: "I got a bit tangled in my own instructions there, Boss — could you rephrase that?" };
}
