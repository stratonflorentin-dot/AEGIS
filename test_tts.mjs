import './test_shim.mjs';
import { isKiswahili } from './src/shared/tts.js';

const cases = [
  ['Nimefungua GitHub kwenye kivinjari lako.', true],
  ['Habari za asubuhi, Boss! Poa kabisa, uko sawa?', true],
  ['Habari boss, uko poa?', true],
  ['Asante sana, MINO.', true],
  ['Unaweza kufungua YouTube?', true],
  ['Good morning boss, systems are nominal.', false],
  ['YouTube is up and running, Boss.', false],
  ['I typed the message and pressed enter.', false],
  ['Tunaenda sasa, Boss.', true],
];

let fail = 0;
for (const [text, expected] of cases) {
  const got = isKiswahili(text);
  const ok = got === expected;
  if (!ok) fail++;
  console.log((ok ? 'PASS' : 'FAIL') + ': "' + text + '" -> ' + got + ' (expected ' + expected + ')');
}
console.log(fail === 0 ? 'ALL DETECTOR TESTS PASSED' : fail + ' FAILURES');
process.exit(fail === 0 ? 0 : 1);
