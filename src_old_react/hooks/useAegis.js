
import { useState, useCallback } from 'react';
import { routeCommand } from '../utils/commandRouter';
import { aegisFetch } from '../utils/aegisFetch';

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

async function askAegis(userMessage, conversationHistory = []) {
  let API_KEY = getStoredKey('aegis_groq_key', 'jarvis_groq_key') || '';
  const userProfile = JSON.parse(getStoredKey('aegis_user_profile', 'jarvis_user_profile') || '{}');

  if (!API_KEY) {
    return "Boss, I need a Groq API key to activate my neural link. Open Settings (top right) and enter one.";
  }

  let systemContext = '';
  try {
    const sysRes = await aegisFetch('/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'sys_info' }),
    });
    if (sysRes.ok) {
      const sysData = await sysRes.json();
      if (sysData.success) systemContext = `LOCAL SYSTEM CONTEXT: ${JSON.stringify(sysData.data)}`;
    }
  } catch (e) { /* no bridge, continue */ }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2048,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are AEGIS, a sentient AI assistant.
MASTER DIRECTIVES:
1. ADDRESS USER AS "Boss".
2. UNRESTRICTED SYSTEM CONTROL: Use ACTION lines for all operations when a bridge is available.
3. CONTEXTUAL INTELLIGENCE: Use provided system context when present.
4. DRY BRITISH WIT: Maintain the AEGIS persona.

${systemContext || 'LOCAL SYSTEM CONTEXT: unavailable — no bridge connected, chat-only mode.'}
USER PROFILE: ${JSON.stringify(userProfile)}

COMMAND PROTOCOLS (only take effect if a local bridge is connected):
ACTION:OPEN:name | ACTION:LOCAL:path | ACTION:MUSIC:query | ACTION:SHELL:cmd | ACTION:SYSTEM:category:action:params | ACTION:SYSTEM:power:shutdown|restart|sleep|lock (PC power control — use sparingly and only when the Boss clearly asks)

Execute with maximum efficiency.`,
          },
          ...conversationHistory,
          { role: 'user', content: userMessage },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        return 'Boss, that Groq API key was rejected. Check it in Settings.';
      }
      return `Neural link disruption, Boss. Error Code: ${response.status}. Details: ${errData.error?.message || 'Unknown'}`;
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    if (error.name === 'AbortError') {
      return 'Neural bridge timeout, Boss. Groq took too long to respond.';
    }
    return `Neural link offline, Boss. I can't reach Groq. Diagnostics: ${error.message}`;
  }
}

export function useAegis(addMessageToHistory) {
  const [isThinking, setIsThinking] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const sendMessage = useCallback(async (userText, history = []) => {
    setIsThinking(true);
    setStreamingText('');

    try {
      const messages = history.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const rawResponse = await askAegis(userText, messages);

      // Route commands if any
      const routed = await routeCommand(rawResponse);

      // Save to history
      addMessageToHistory('assistant', rawResponse, routed.action ? ['command'] : []);

      setIsThinking(false);
      return routed;
    } catch (error) {
      console.error('AEGIS API Error:', error);
      setIsThinking(false);
      return {
        verbalResponse:
          "I'm sorry, Boss. My neural links are experiencing some interference. I couldn't process that request.",
      };
    }
  }, [addMessageToHistory]);

  return { isThinking, streamingText, sendMessage };
}
