import { env } from '../config'
import { TOOL_SCHEMAS } from './mino/toolSchemas.js'
import { createToolExecutors } from './mino/toolExecutors.js'
import { buildSystemPrompt } from './mino/systemPrompt.js'
import { postJSON } from './mino/bridgeClient.js'

/**
 * The Groq brain — MINO's direct backend. Same one-turn contract as the Claude
 * direct path (ask/cancel/connectedLabels), but the model is Groq and the tools
 * are the local PC bridge's own HTTP endpoints instead of remote MCP servers.
 *
 * The interface cyan never knew the difference: it only ever saw text deltas and
 * tool phases, which is exactly what this module streams back.
 */

export type Msg = { role: 'user' | 'assistant'; content: string }

export type AskHandlers = {
  /** Fires for each chunk of the spoken answer. */
  onText: (delta: string) => void
  /** Fires when a local tool starts running. */
  onTool: (name: string) => void
}

/** Tool execution with a headless UI context — log to console; the holographic
 *  HUD has its own task surfaces and the bridge carries no panel channel. */
const executors = createToolExecutors({
  postJSON,
  appUrls: {},
  logTerminal: (line: string) => console.log('[mino]', line),
  addTask: () => {},
  completeTask: () => {},
  onMusicSearch: async (query: string) => {
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank')
    return { success: true, message: `Opened a YouTube search for "${query}".` }
  },
  setVolumeUI: () => {},
  togglePlaybackUI: () => {},
  onPowerCountdown: () => {},
  getApiKey: () => env.groqKey,
  visionModel: null,
})

let cancelled = false
let active: AbortController | null = null

/** Model routing: the reasoning model handles anything analytical, the small
 *  model keeps casual turns snappy. (Models available on current Groq accounts;
 *  llama-3.3-70b-versatile was retired upstream.) */
const BIG_MODEL = 'openai/gpt-oss-120b'
const FAST_MODEL = 'openai/gpt-oss-20b'
const COMPLEXITY_RE =
  /\b(why|how (come|do|does|can|would|should)|explain|analyz|compar|design|plan|strategy|debug|refactor|optimi[sz]|architect|trade-?offs?|pros and cons|step by step|calculate|solve|equation|prove|research|code|script|algorithm|summar.{0,10}(file|page|article|document))\b/i

function pickModel(text: string): string {
  const t = (text || '').trim()
  if (!t) return FAST_MODEL
  if (t.length > 240 || COMPLEXITY_RE.test(t)) return BIG_MODEL
  return FAST_MODEL
}

/** Live PC awareness: per-turn vitals from the bridge, best-effort — the brain
 *  should know the machine it sits on even before any tool runs. */
async function pcSystemContext(): Promise<string> {
  try {
    const metrics = await postJSON('/execute', { command: 'metrics' })
    const info = await postJSON('/execute', { command: 'sys_info' })
    return JSON.stringify({
      metrics: metrics?.data ?? null,
      platform: info?.data ?? null,
    })
  } catch {
    return ''
  }
}

async function callGroq(model: string, messages: unknown[], tools: unknown[], signal: AbortSignal) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.groqKey}` },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.7,
      reasoning_effort: model === BIG_MODEL ? 'medium' : 'low',
      messages,
      ...(tools.length ? { tools, tool_choice: 'auto' } : {}),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err: any = new Error(data?.error?.message || `Groq HTTP ${res.status}`)
    err.status = res.status
    err.code = data?.error?.code
    throw err
  }
  return data
}

const MAX_ITERATIONS = 6

/**
 * One turn of conversation. `history` already ends with the user's message
 * (brain.ts threads it through exactly like the Claude direct path).
 */
export async function ask(
  history: Msg[],
  handlers: AskHandlers,
): Promise<{ text: string; tools: string[] }> {
  const usedTools: string[] = []
  cancelled = false
  active = new AbortController()
  const signal = active.signal

  const systemContext = await pcSystemContext()
  const systemPrompt = buildSystemPrompt({ systemContext })

  const userText = [...history].reverse().find((m) => m.role === 'user')?.content || ''
  const model = pickModel(userText)

  interface ToolCall {
    id: string
    function: { name: string; arguments: string }
  }
  const messages: any[] = [{ role: 'system', content: systemPrompt }, ...history]

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      if (cancelled) return { text: '', tools: usedTools }

      let data: any
      try {
        data = await callGroq(model, messages, TOOL_SCHEMAS, signal)
      } catch (err: any) {
        // Groq's free tier trips its own TPM limit mid-loop sometimes: wait out
        // the suggested backoff once before surfacing anything to the user.
        if (err.status === 429 && !cancelled && i < MAX_ITERATIONS - 1) {
          const waitS = /try again in ([\d.]+)s/i.test(err.message || '')
            ? Math.min(parseFloat((err.message.match(/try again in ([\d.]+)s/i) || [])[1]) + 0.5, 30)
            : 12
          await new Promise((r) => setTimeout(r, waitS * 1000))
          if (cancelled) return { text: '', tools: usedTools }
          continue
        }
        if (cancelled) return { text: '', tools: usedTools }
        throw err
      }

      const message = data.choices[0].message
      const toolCalls: ToolCall[] = message.tool_calls || []

      if (toolCalls.length) {
        messages.push({ role: 'assistant', content: message.content || null, tool_calls: toolCalls })
        for (const call of toolCalls) {
          if (cancelled) return { text: '', tools: usedTools }
          usedTools.push(call.function.name)
          handlers.onTool(call.function.name)
          let result: unknown
          try {
            const args = call.function.arguments ? JSON.parse(call.function.arguments) : {}
            const executor = (executors as any)[call.function.name]
            result = executor ? await executor(args) : { success: false, message: `Unknown tool "${call.function.name}".` }
          } catch (e: any) {
            result = { success: false, message: e?.message || String(e) }
          }
          messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
        }
        continue
      }

      const text: string = message.content || ''
      // Everything must flow through onText as well as the return — App speaks
      // the deltas; a line that is merely returned is a line nobody hears.
      if (text) handlers.onText(text)
      return { text: text.trim(), tools: usedTools }
    }

    const line = ' That is taking longer than it should, Boss. Ask me again.'
    handlers.onText(line)
    return { text: line.trim(), tools: usedTools }
  } finally {
    active = null
  }
}

/** Barge-in. Stops the generation, not just the speaker. */
export function cancel(): void {
  cancelled = true
  active?.abort()
}

/** Labels for the HUD's SYSTEMS rail. */
export function connectedLabels(): string[] {
  const labels = ['GROQ', 'PC BRIDGE', 'MEMORY']
  return labels
}
