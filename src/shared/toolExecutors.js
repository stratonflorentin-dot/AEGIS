// Executes tool calls named in toolSchemas.js. `ctx` supplies the DOM/UI hooks each
// executor needs (Active Tasks panel, System Log terminal, media UI, power countdown),
// so this module stays free of direct DOM access and is reusable from any host page.
import { remember as rememberFact, recall as recallFacts } from './memoryClient.js';

export function createToolExecutors(ctx) {
  const { postJSON, appUrls, logTerminal, addTask, completeTask, onMusicSearch, setVolumeUI, togglePlaybackUI, onPowerCountdown, getApiKey, visionModel } = ctx;

  async function withTask(taskName, fn) {
    addTask(taskName);
    try {
      return await fn();
    } finally {
      completeTask(taskName);
    }
  }

  return {
    async open_app({ name }) {
      const key = String(name || '').toLowerCase().trim();
      const url = appUrls[key];
      if (!url) return { success: false, message: `Unknown app "${name}".` };
      window.open(url, '_blank');
      return { success: true, message: `Opened ${key}.` };
    },

    async open_local_path({ path }) {
      return postJSON('/execute', { command: path });
    },

    async run_shell_command({ command }) {
      return withTask('SHELL', async () => {
        logTerminal(`SHELL: ${command}`);
        const data = await postJSON('/execute', { command: `shell:${command}` });
        logTerminal(`SHELL -> ${data.success ? 'SUCCESS' : 'FAILED'}${data.output ? ': ' + data.output.trim().slice(0, 200) : ''}`);
        return data;
      });
    },

    async play_music({ query }) {
      return onMusicSearch(query);
    },

    async media_control({ action, level }) {
      if (action === 'volume') {
        setVolumeUI(level);
        return postJSON('/media', { action: 'set_volume', level: parseInt(level, 10) });
      }
      const playing = action === 'play';
      togglePlaybackUI(playing);
      return postJSON('/media', { action: playing ? 'play' : 'pause' });
    },

    async manage_file({ action, path, destination, content }) {
      return withTask(`FILE:${action}`.toUpperCase(), async () => {
        const data = await postJSON('/system', { category: 'file', action, path, destination, content });
        logTerminal(`file:${action} -> ${data.success ? 'SUCCESS' : 'FAILED'}`);
        return data;
      });
    },

    async manage_app({ action, app_name }) {
      return withTask(`APP:${action}`.toUpperCase(), async () => {
        const data = await postJSON('/system', { category: 'app', action, app_name });
        logTerminal(`app:${action} -> ${data.success ? 'SUCCESS' : 'FAILED'}`);
        return data;
      });
    },

    async manage_power({ action }) {
      return withTask(`POWER:${action}`.toUpperCase(), async () => {
        const data = await postJSON('/system', { category: 'power', action });
        logTerminal(`power:${action} -> ${data.success ? 'SUCCESS' : 'FAILED'}`);
        if (data.success && (action === 'shutdown' || action === 'restart')) onPowerCountdown(action);
        return data;
      });
    },

    async open_browser_url({ url }) {
      return withTask('BROWSER:OPEN', async () => {
        const data = await postJSON('/system', { category: 'browser', url });
        logTerminal(`browser:open -> ${data.success ? 'SUCCESS' : 'FAILED'}`);
        return data;
      });
    },

    async send_email_draft({ to, subject, body }) {
      return postJSON('/system', { category: 'productivity', action: 'email', params: { to, subject, body } });
    },

    async create_document({ name, content }) {
      return postJSON('/system', { category: 'productivity', action: 'document', params: { name, content } });
    },

    async web_search({ query }) {
      return withTask('WEB:SEARCH', async () => {
        const data = await postJSON('/web_search', { query });
        logTerminal(`web_search -> ${data.success ? `${data.results.length} results` : 'FAILED'}`);
        return data;
      });
    },

    async fetch_url({ url }) {
      return withTask('WEB:FETCH', async () => {
        const data = await postJSON('/fetch_url', { url });
        logTerminal(`fetch_url -> ${data.success ? 'SUCCESS' : 'FAILED'}`);
        return data;
      });
    },

    async take_screenshot({ question }) {
      return withTask('SCREENSHOT', async () => {
        const shot = await postJSON('/screenshot', {});
        if (!shot.success) {
          logTerminal('SCREENSHOT -> FAILED');
          return shot;
        }
        logTerminal(`SCREENSHOT -> CAPTURED [${shot.width}x${shot.height}]`);

        const apiKey = getApiKey ? getApiKey() : null;
        if (!apiKey || !visionModel) {
          return {
            success: true,
            message: `Screenshot captured (${shot.width}x${shot.height}), but no vision-capable model is configured on this Groq account to describe it.`,
          };
        }
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: visionModel,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: question || 'Describe what is on this screen.' },
                    { type: 'image_url', image_url: { url: `data:image/png;base64,${shot.image_base64}` } },
                  ],
                },
              ],
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return {
              success: true,
              message: `Screenshot captured (${shot.width}x${shot.height}), but the vision model call failed: ${err.error?.message || res.status}.`,
            };
          }
          const data = await res.json();
          return { success: true, description: data.choices[0].message.content };
        } catch (e) {
          return { success: true, message: `Screenshot captured (${shot.width}x${shot.height}), but describing it failed: ${e.message}.` };
        }
      });
    },

    async clipboard_read() {
      return postJSON('/clipboard', { action: 'read' });
    },

    async clipboard_write({ text }) {
      return postJSON('/clipboard', { action: 'write', text });
    },

    async type_text({ text, press_enter }) {
      return withTask('TYPE', async () => {
        logTerminal(`TYPE: ${String(text).slice(0, 40)}${String(text).length > 40 ? '…' : ''}`);
        const data = await postJSON('/type_text', { text, press_enter: !!press_enter });
        logTerminal(`type_text -> ${data.success ? 'SUCCESS' : 'FAILED'}`);
        return data;
      });
    },

    async press_key({ key }) {
      return withTask(`KEY:${String(key).toUpperCase()}`, async () => {
        const data = await postJSON('/press_key', { key });
        logTerminal(`press_key:${key} -> ${data.success ? 'SUCCESS' : 'FAILED'}`);
        return data;
      });
    },

    async window_control({ action, title }) {
      return withTask(`WINDOW:${action}`.toUpperCase(), async () => {
        const data = await postJSON('/window', { action, title });
        logTerminal(`window:${action} -> ${data.success ? 'SUCCESS' : 'FAILED'}`);
        return data;
      });
    },

    async remember({ category, key, value }) {
      const data = await rememberFact(category, key, value);
      logTerminal(`remember -> ${category}:${key}`);
      return data;
    },

    async recall({ category, query }) {
      return recallFacts(category, query);
    },

    async set_reminder({ message, when }) {
      const data = await postJSON('/reminders', { action: 'set', message, when });
      logTerminal(`reminder:set -> ${data.success ? 'SUCCESS' : 'FAILED'}`);
      return data;
    },

    async get_weather({ location }) {
      return postJSON('/weather', { location });
    },

    async search_files({ pattern, base_dir }) {
      return withTask('FILE:SEARCH', async () => {
        const data = await postJSON('/file_search', { pattern, base_dir });
        logTerminal(`file_search -> ${data.success ? `${(data.matches || []).length} match(es)` : 'FAILED'}`);
        return data;
      });
    },

    async brightness_control({ action, level }) {
      const data = await postJSON('/brightness', { action, level });
      logTerminal(`brightness:${action} -> ${data.success ? 'SUCCESS' : 'FAILED'}`);
      return data;
    },

    async read_screen_text() {
      return withTask('OCR', async () => {
        const data = await postJSON('/ocr', {});
        logTerminal(`ocr -> ${data.success ? 'SUCCESS' : 'FAILED'}`);
        return data;
      });
    },
  };
}
