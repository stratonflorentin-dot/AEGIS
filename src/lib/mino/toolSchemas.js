// OpenAI-compatible tool/function-calling schemas for Groq chat completions.
// Each entry maps 1:1 onto an existing dev_server.py bridge endpoint (see toolExecutors.js),
// except open_app which is handled entirely client-side.

export const TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'open_app',
      description:
        'Open a well-known web app/site in a new browser tab (e.g. youtube, spotify, github, gmail). Works even without a local bridge.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description:
              'App key: youtube, spotify, github, gmail, google, chatgpt, netflix, twitter, reddit, notion, whatsapp, figma, discord, slack, zoom, linkedin, drive, docs, sheets, maps, or wikipedia.',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_local_path',
      description:
        "Open a local file, folder, or URL on the Boss's PC using its default OS handler. Requires a local bridge.",
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Absolute file/folder path, or a URL.' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_shell_command',
      description:
        "Run an arbitrary shell command on the Boss's PC and return its output. Powerful — only use when clearly asked or clearly necessary. Requires a local bridge.",
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: 'The shell command to execute.' } },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'play_music',
      description: 'Search YouTube and play a track/video in the Media Link panel. Requires a local bridge.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query, e.g. song and artist.' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'media_control',
      description: 'Control playback of the currently loaded media: play, pause, or set volume. Requires a local bridge.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['play', 'pause', 'volume'] },
          level: { type: 'integer', description: 'Volume 0-100. Required when action is "volume".' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_file',
      description: "Create, delete, move, or copy a file/folder on the Boss's PC. Requires a local bridge.",
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['create', 'delete', 'move', 'copy'] },
          path: { type: 'string' },
          destination: { type: 'string', description: 'Required for move/copy.' },
          content: { type: 'string', description: 'File content, used for create.' },
        },
        required: ['action', 'path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_app',
      description: "Launch or close a desktop application on the Boss's PC. Requires a local bridge.",
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['launch', 'close'] },
          app_name: { type: 'string' },
        },
        required: ['action', 'app_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_power',
      description:
        "Control PC power state: shutdown/restart (10s cancellable delay), sleep, lock (instant), or cancel a pending shutdown/restart. Use sparingly and only when clearly asked. Requires a local bridge.",
      parameters: {
        type: 'object',
        properties: { action: { type: 'string', enum: ['shutdown', 'restart', 'sleep', 'lock', 'cancel'] } },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_browser_url',
      description:
        "Open a URL in the default browser on the Boss's PC (as opposed to the device running this chat — useful when a phone is remotely driving the PC). Requires a local bridge.",
      parameters: {
        type: 'object',
        properties: { url: { type: 'string' } },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email_draft',
      description: 'Open the default email client with a pre-filled draft (to/subject/body). Requires a local bridge.',
      parameters: {
        type: 'object',
        properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } },
        required: ['to'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_document',
      description: "Create a text document in the Boss's Documents folder and open it. Requires a local bridge.",
      parameters: {
        type: 'object',
        properties: { name: { type: 'string' }, content: { type: 'string' } },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web (DuckDuckGo) and return the top results (title, URL, snippet). Requires a local bridge.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description: 'Fetch a web page and return its title and extracted main text, for reading or summarizing a specific URL. Requires a local bridge.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string' } },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'take_screenshot',
      description: "Capture the Boss's screen and describe what's on it. Requires a local bridge; the description step additionally requires a vision-capable model to be available on the connected Groq account.",
      parameters: {
        type: 'object',
        properties: { question: { type: 'string', description: 'What to look for or answer about the screen, e.g. "what app is in focus?".' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'clipboard_read',
      description: "Read the current contents of the Boss's OS clipboard. Requires a local bridge.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'clipboard_write',
      description: "Write text to the Boss's OS clipboard. Requires a local bridge.",
      parameters: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'type_text',
      description:
        "Type text into whatever window/app is currently focused on the Boss's PC (chat apps, forms, editors, search bars). Useful after window_control focus. Newlines send Enter within the text. Requires a local bridge.",
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The text to type.' },
          press_enter: { type: 'boolean', description: 'Also press Enter after typing (e.g. to send a chat message).' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'press_key',
      description:
        "Press a single key in the currently focused window on the Boss's PC: enter, esc, tab, space, backspace, delete, insert, arrows (up/down/left/right), home, end, pageup, pagedown, f1-f12, or any single letter/digit. Use after window_control focus, e.g. to accept a dialog or submit a form. Requires a local bridge.",
      parameters: {
        type: 'object',
        properties: { key: { type: 'string' } },
        required: ['key'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'window_control',
      description: "List open windows, or focus/minimize/maximize/close one by (partial) title, on the Boss's PC. Requires a local bridge.",
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'focus', 'minimize', 'maximize', 'close'] },
          title: { type: 'string', description: 'Required for all actions except "list".' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remember',
      description: 'Save a fact about the Boss for future conversations — preferences, ongoing projects, people, or general notes worth persisting.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['identity', 'preferences', 'projects', 'relationships', 'notes'] },
          key: { type: 'string', description: 'Short label for the fact, e.g. "favorite_editor".' },
          value: { type: 'string' },
        },
        required: ['category', 'key', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recall',
      description: 'Look up previously remembered facts about the Boss, optionally filtered by category or a search term. A short summary of recent facts is already given in the system context — use this tool to search beyond that.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['identity', 'preferences', 'projects', 'relationships', 'notes'] },
          query: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_reminder',
      description: "Set a one-shot reminder that AEGIS will proactively surface (spoken and in chat) when it comes due — even if the Boss hasn't asked anything since. Compute the target time yourself from the current time given in system context. Requires a local bridge, and the app must stay open (or the bridge polled) for it to fire.",
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'What to remind the Boss about.' },
          when: { type: 'string', description: 'Target time as an ISO 8601 datetime, e.g. "2026-08-06T15:30:00".' },
        },
        required: ['message', 'when'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather conditions for a location (temperature, condition, humidity, wind). Requires a local bridge.',
      parameters: {
        type: 'object',
        properties: { location: { type: 'string', description: 'City name, e.g. "London" or "San Francisco, CA".' } },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_files',
      description: "Search for files by name (or glob pattern) under a directory on the Boss's PC. Requires a local bridge.",
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'A name fragment (e.g. "invoice") or a glob pattern (e.g. "*.pdf").' },
          base_dir: { type: 'string', description: 'Directory to search under. Defaults to the home directory.' },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'brightness_control',
      description: "Get or set the screen brightness on the Boss's PC. Requires a local bridge and a display that supports software brightness control.",
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['get', 'set'] },
          level: { type: 'integer', description: 'Brightness 0-100. Required when action is "set".' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_screen_text',
      description: "Capture the Boss's screen and extract any visible text via OCR — useful for reading dialogs, code, or documents on screen without needing a vision-capable model. Requires a local bridge with Tesseract OCR installed.",
      parameters: { type: 'object', properties: {} },
    },
  },
];
