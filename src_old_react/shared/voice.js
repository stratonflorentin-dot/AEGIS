// Wake-word detection and turn-taking stay on the browser's built-in SpeechRecognition —
// it's free, local, and good enough for spotting a keyword and detecting when the user
// stops talking. The actual command text sent to the LLM is transcribed by Groq Whisper
// for higher accuracy; SpeechRecognition's own transcript is kept only as a same-turn
// fallback if the Whisper call fails or no API key is set.

let mediaStream = null;
let mediaRecorder = null;
let chunks = [];

async function ensureStream() {
  if (mediaStream) return mediaStream;
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return mediaStream;
}

export async function startRecording() {
  try {
    if (mediaRecorder && mediaRecorder.state === 'recording') return;
    const stream = await ensureStream();
    chunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.start();
  } catch (e) {
    mediaRecorder = null;
    console.warn('Mic recording unavailable:', e.message);
  }
}

export function stopRecording() {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      resolve(null);
      return;
    }
    mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }));
    mediaRecorder.stop();
  });
}

export async function transcribeWithGroq({ apiKey, blob, model = 'whisper-large-v3-turbo' }) {
  if (!apiKey || !blob || blob.size === 0) return null;
  const form = new FormData();
  form.append('file', blob, 'command.webm');
  form.append('model', model);
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Whisper HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.text || '').trim();
}
