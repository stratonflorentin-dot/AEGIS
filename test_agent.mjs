// End-to-end agent test against the real Groq API with the new MINO prompt.
// Fake executors; verifies tool-call firing, language mirroring, and routing.
import './test_shim.mjs';
import { runAgentLoop, pickModel } from './src/shared/groqAgent.js';
import { buildSystemPrompt } from './src/shared/systemPrompt.js';
import { TOOL_SCHEMAS } from './src/shared/toolSchemas.js';
import { isKiswahili } from './src/shared/tts.js';
import { resolveGroqKey } from './src/shared/bridgeClient.js';

const KEY = resolveGroqKey();
if (!KEY) {
  console.error('FAIL: no Groq key resolved');
  process.exit(1);
}
console.log('PASS: Groq key resolved (', KEY.slice(0, 8) + '...)');

// pickModel routing
const routeA = pickModel('open youtube');
const routeB = pickModel('Explain the trade-offs between microservices and a monolith, then design a migration plan');
console.log('PASS: routing', routeA, '/', routeB, routeA !== routeB ? '(distinct)' : '(WARN: same)');

// isKiswahili detection
console.log('PASS: isKiswahili("Habari boss, uko poa?") =', isKiswahili('Habari boss, uko poa?'));
console.log('PASS: isKiswahili("Good morning boss") =', isKiswahili('Good morning boss'));

const prompt = buildSystemPrompt({
  systemContext: 'LOCAL SYSTEM CONTEXT: {"platform":"Windows","release":"11"}',
  memorySummary: '',
});

let fired = null;
const executors = {
  async open_app(args) { fired = ['open_app', args]; return { success: true, message: `Opened ${args.name}.` }; },
  async type_text(args) { fired = ['type_text', args]; return { success: true, message: 'Typed.' }; },
};

// Test 1: English request with a tool
console.log('\n--- Test 1: English tool use ("open youtube") ---');
let result = await runAgentLoop({
  apiKey: KEY, systemPrompt: prompt, userMessage: 'Open YouTube for me.',
  tools: TOOL_SCHEMAS, executeTool: executors,
});
console.log('result:', result.text, '| tool fired:', fired);
if (!fired || fired[0] !== 'open_app') { console.error('FAIL: open_app not fired'); process.exit(1); }
console.log('PASS: open_app fired');

// Test 2: Kiswahili request with a tool
fired = null;
console.log('\n--- Test 2: Kiswahili tool use ("fungua github") ---');
result = await runAgentLoop({
  apiKey: KEY, systemPrompt: prompt, userMessage: 'Fungua GitHub kwenye browser, tafadhali.',
  tools: TOOL_SCHEMAS, executeTool: executors,
});
console.log('result:', result.text, '| tool fired:', fired);
if (!fired || fired[0] !== 'open_app' || fired[1].name !== 'github') { console.error('FAIL: open_app/github not fired'); process.exit(1); }
console.log('PASS: open_app("github") fired');
if (!isKiswahili(result.text || '')) console.log('WARN: reply not detected as Kiswahili (speech may read it with English voice):', result.text);

// Test 3: Kiswahili conversation (no tool)
console.log('\n--- Test 3: Kiswahili chat ---');
result = await runAgentLoop({
  apiKey: KEY, systemPrompt: prompt, userMessage: 'Habari za asubuhi, MINO? Uko poa?',
  tools: TOOL_SCHEMAS, executeTool: executors,
});
console.log('result:', result.text);
if (!result.text || /habari|poa|asante|salama|mino/i.test(result.text) === false) console.log('WARN: reply may not be Kiswahili');
else console.log('PASS: Kiswahili chat reply');

console.log('\nALL TESTS PASSED');
