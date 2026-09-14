// Groq TTS (Orpheus) with an automatic fallback to the browser's built-in speechSynthesis,
// so AEGIS is never left silent — missing/rejected key, network failure, or the Groq org
// not having accepted the model's terms yet at console.groq.com all degrade gracefully.
// Kiswahili replies skip Groq TTS entirely (Orpheus is English-only) and use the browser
// engine with a Swahili voice when one is installed.
const DEFAULT_MODEL = 'canopylabs/orpheus-v1-english';
const DEFAULT_VOICE = 'troy'; // deep/warm male voice — closest match on Groq's own roster

// Distinctive Kiswahili words — none occur in ordinary English text, so a single hit
// is a strong signal. (Kiswahili verbs take prefixes — nime-/uta-/a- — so exact-verb
// matching is unreliable; function words below carry most of the signal.)
const SWAHILI_DISTINCTIVE_RE =
  /\b(hapana|asante|karibu|habari|rafiki|tafadhali|samahani|ndiyo|nakupenda|naweza|unaweza|asubuhi|mchana|jioni|usiku|kesho|jana|leo|kidogo|nzuri|poa|kwa nini|kwa nini|wapi|nani|nini|lini|simama|subiri|endelea|salama|chakula|maji|shule|kazi|nyumba|pesa|simu|mteja|ndugu|mzazi|bwana|asante|karibu|nakuelewa|vizuri|pole|asante|kwa sababu|hivyo|kweli|bure|basi|yaani|kumbe|sasa hivi|kabisa|sasa|sawa|vizuri)\b/i;

// Short Kiswahili function/possessive words that never appear in English; two or more
// hits together also signal Kiswahili (covers prefixed verb forms like "nimefungua").
const SWAHILI_GENERIC_RE = /\b(ni|wa|kwa|na|ya|za|cha|hu|li|kwenye|lako|yako|wako|zako|yangu|wangu|langu|yetu|zetu|kabisa|sana|pia|lakini|kama|yote|wote|tena|hapa|kwanza|tu)\b/gi;

export function isKiswahili(text) {
  if (!text) return false;
  if (SWAHILI_DISTINCTIVE_RE.test(text)) return true;
  const generic = (text.match(SWAHILI_GENERIC_RE) || []).length;
  return generic >= 2;
}

let currentAudio = null;

async function speakGroq({ apiKey, text, voice, model, onStart, onEnd }) {
  const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      input: text,
      voice: voice || DEFAULT_VOICE,
      response_format: 'wav',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `TTS HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  await new Promise((resolve, reject) => {
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onplay = () => onStart && onStart();
    audio.onended = () => {
      onEnd && onEnd();
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      reject(new Error('Audio playback failed'));
    };
    audio.play().catch(reject);
  });
}

function speakBrowser(text, { onStart, onEnd, voicePredicate, lang } = {}) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    let preferred = (voicePredicate && voices.find(voicePredicate)) || voices.find((v) => v.lang === 'en-GB');
    if (lang) {
      // For Kiswahili, prefer a voice whose locale matches; many systems have none,
      // in which case the default voice still reads the text (accent may be rough).
      const langVoice = voices.find((v) => (v.lang || '').toLowerCase().startsWith(lang.slice(0, 2)));
      if (langVoice) preferred = langVoice;
      u.lang = lang;
    }
    if (preferred) u.voice = preferred;
    u.rate = 1.0;
    u.pitch = 0.9;
    u.onstart = () => onStart && onStart();
    u.onend = () => onEnd && onEnd();
    u.onerror = () => onEnd && onEnd();
    window.speechSynthesis.speak(u);
  } catch (e) {
    /* speech unavailable */
  }
}

export async function speak(text, { apiKey, voice, model, onStart, onEnd, voicePredicate } = {}) {
  if (isKiswahili(text)) {
    // Groq's Orpheus voices are English-only — Kiswahili goes straight to the browser engine.
    speakBrowser(text, { onStart, onEnd, lang: 'sw-KE' });
    return;
  }
  if (apiKey) {
    try {
      await speakGroq({ apiKey, text, voice, model, onStart, onEnd });
      return;
    } catch (e) {
      console.warn('Groq TTS unavailable, falling back to browser speech:', e.message);
    }
  }
  speakBrowser(text, { onStart, onEnd, voicePredicate });
}

export function cancelSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}
