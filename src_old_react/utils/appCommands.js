// Map of voice/text commands to system actions 
// On web: use window.open() for browser apps 

export const APP_MAP = {
  // Browsers & Web 
  'chrome':      { web: 'https://www.google.com', label: 'CHROME' },
  'browser':     { web: 'https://www.google.com', label: 'BROWSER' },
  'youtube':     { web: 'https://youtube.com', label: 'YOUTUBE' },
  'gmail':       { web: 'https://mail.google.com', label: 'GMAIL' },
  'github':      { web: 'https://github.com', label: 'GITHUB' },
  'google':      { web: 'https://google.com', label: 'GOOGLE' },
  'chatgpt':     { web: 'https://chat.openai.com', label: 'CHATGPT' },
  'notion':      { web: 'https://notion.so', label: 'NOTION' },
  'spotify':     { web: 'https://open.spotify.com', label: 'SPOTIFY' },
  'netflix':     { web: 'https://netflix.com', label: 'NETFLIX' },
  'twitter':     { web: 'https://x.com', label: 'TWITTER' },
  'reddit':      { web: 'https://reddit.com', label: 'REDDIT' },

  // System apps (via Electron shell or URI schemes) 
  'vs code':     { uri: 'vscode://', label: 'VS CODE' },
  'trae':        { web: 'https://trae.ai', label: 'TRAE' }, // Placeholder web link
  'notepad':     { label: 'NOTEPAD' },
  'calculator':  { label: 'CALCULATOR' },
  'explorer':    { label: 'EXPLORER' },
  'terminal':    { label: 'TERMINAL' },
  'discord':     { uri: 'discord://', label: 'DISCORD' },
  'slack':       { uri: 'slack://', label: 'SLACK' },
  'zoom':        { uri: 'zoommtg://', label: 'ZOOM' },
  'whatsapp':    { web: 'https://web.whatsapp.com', label: 'WHATSAPP' },
  'figma':       { web: 'https://figma.com', label: 'FIGMA' },
};

export function executeAppCommand(action, appName) {
  const appKey = appName.toLowerCase().trim();
  const app = APP_MAP[appKey];
  
  if (!app) return { success: false, message: `Application ${appName} not found.` };

  if (action === 'OPEN') {
    if (app.web) {
      window.open(app.web, '_blank');
      return { success: true, message: `Opening ${app.label} in new tab.` };
    } else if (app.uri) {
      window.location.href = app.uri;
      return { success: true, message: `Launching ${app.label} via URI.` };
    }
    return { success: false, message: `${app.label} cannot be opened from browser.` };
  }
  
  if (action === 'CLOSE') {
    // In browser environment, we can't really "close" other apps or even tabs we didn't open.
    return { success: false, message: `Closing ${app.label} is restricted by browser security.` };
  }

  return { success: false, message: `Action ${action} not supported.` };
}
