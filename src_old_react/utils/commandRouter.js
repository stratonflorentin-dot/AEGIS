
import { executeAppCommand } from './appCommands';
import { aegisFetch } from './aegisFetch';

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

const APP_URLS = {
  youtube: 'https://youtube.com',
  spotify: 'https://open.spotify.com',
  github: 'https://github.com',
  gmail: 'https://mail.google.com',
  google: 'https://google.com',
  chatgpt: 'https://chat.openai.com',
  netflix: 'https://netflix.com',
  twitter: 'https://x.com',
  reddit: 'https://reddit.com',
  notion: 'https://notion.so',
  whatsapp: 'https://web.whatsapp.com',
  figma: 'https://figma.com',
  discord: 'https://discord.com/app',
  slack: 'https://app.slack.com',
  zoom: 'https://zoom.us',
  linkedin: 'https://linkedin.com',
  drive: 'https://drive.google.com',
  docs: 'https://docs.google.com',
  sheets: 'https://sheets.google.com',
  maps: 'https://maps.google.com',
  wikipedia: 'https://wikipedia.org',
};

let ytPlayer;
if (typeof window !== 'undefined') {
  window.onYouTubeIframeAPIReady = () => {
    const playerEl = document.getElementById('youtube-player');
    if (playerEl) {
      ytPlayer = new window.YT.Player('youtube-player', {
        events: {
          onStateChange: (event) => {
            const icon = document.getElementById('play-icon');
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (icon) {
              }
            } else if (
              event.data === window.YT.PlayerState.PAUSED ||
              event.data === window.YT.PlayerState.ENDED
            ) {
              if (icon) {
              }
            }
          },
          onError: (event) =>
            console.error(`MEDIA_ERROR: STREAM_UNAVAILABLE [Code: ${event.data}]`),
        },
      });
    }
  };
}

export async function routeCommand(text) {
  const lines = text.split('\n');
  let verbalResponse = [];

  for (let line of lines) {
    const actionLine = line.trim();

    if (actionLine.startsWith('ACTION:OPEN:')) {
      const appName = actionLine.replace('ACTION:OPEN:', '').toLowerCase().trim();
      const url = APP_URLS[appName];
      if (url) window.open(url, '_blank');
      continue;
    }

    if (actionLine.startsWith('ACTION:LOCAL:')) {
      const localCmd = actionLine.replace('ACTION:LOCAL:', '').trim();
      try {
        await aegisFetch('/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: localCmd }),
        });
      } catch (e) {
        console.error('Local execution failed:', e);
      }
      continue;
    }

    if (actionLine.startsWith('ACTION:MUSIC:')) {
      const query = actionLine.replace('ACTION:MUSIC:', '').trim();
      const trackTitle = document.getElementById('track-title');
      const trackArtist = document.getElementById('track-artist');
      const videoContainer = document.getElementById('video-container');
      const youtubePlayer = document.getElementById('youtube-player');

      if (trackTitle) trackTitle.textContent = 'Searching…';
      if (trackArtist) trackArtist.textContent = query;

      try {
        const res = await aegisFetch('/search_music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.videoId) {
            if (videoContainer) videoContainer.classList.remove('hidden');
            if (ytPlayer && ytPlayer.loadVideoById) {
              ytPlayer.loadVideoById(data.videoId);
              ytPlayer.playVideo();
            } else if (youtubePlayer) {
              youtubePlayer.src = `https://www.youtube.com/embed/${data.videoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&rel=0&playsinline=1`;
            }
            if (trackTitle) trackTitle.textContent = query;
            if (trackArtist) trackArtist.textContent = 'Streaming from archives';
          }
        }
      } catch (e) {
        console.error('MUSIC_LINK: CRITICAL ERROR', e);
      }
      continue;
    }

    if (actionLine.startsWith('ACTION:SHELL:')) {
      const shellCmd = actionLine.replace('ACTION:SHELL:', '').trim();
      try {
        const res = await aegisFetch('/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: `shell:${shellCmd}` }),
        });
        await res.json();
      } catch (e) {
        console.error('SHELL: ERROR', e);
      }
      continue;
    }

    if (actionLine.startsWith('ACTION:SYSTEM:')) {
      const parts = actionLine.replace('ACTION:SYSTEM:', '').split(':');
      const category = parts[0];
      const action = parts[1];
      const rawParams = actionLine.substring(actionLine.indexOf(action) + action.length + 1);
      let body = { category, action };
      if (category === 'file') {
        const p = rawParams.split('|');
        body.path = p[0];
        if (action === 'create') body.content = p[1];
        if (action === 'move' || action === 'copy') body.destination = p[1];
      } else if (category === 'app') {
        body.app_name = rawParams;
      } else if (category === 'browser') {
        body.url = rawParams;
      } else if (category === 'productivity') {
        try {
          body.params = JSON.parse(rawParams);
        } catch (e) {}
      }

      try {
        const res = await aegisFetch('/system', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        await res.json();
      } catch (e) {
        console.error(`${category}:${action} -> ERROR', e);
      }
      continue;
    }

    if (actionLine.startsWith('ACTION:MEDIA:')) {
      const subAction = actionLine.replace('ACTION:MEDIA:', '').toLowerCase().trim();
      if (subAction === 'pause') {
        if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
      } else if (subAction === 'play') {
        if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo();
      } else if (subAction.startsWith('volume:')) {
        const level = parseInt(subAction.split(':')[1]);
        if (!isNaN(level)) {
          const volumeSlider = document.getElementById('volume-slider');
          const volumeVal = document.getElementById('volume-val');
          if (volumeSlider) volumeSlider.value = level;
          if (volumeVal) volumeVal.textContent = `${level}%`;
          try {
            await aegisFetch('/media', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'set_volume', level }),
            });
          } catch (e) {}
        }
      }
      continue;
    }

    if (actionLine.startsWith('ACTION:MEM:')) {
      const parts = actionLine.replace('ACTION:MEM:', '').split(':');
      if (parts.length >= 2) {
        const profile = JSON.parse(getStoredKey('aegis_user_profile', 'jarvis_user_profile') || '{}');
        profile[parts[0].trim()] = parts[1].trim();
        localStorage.setItem('aegis_user_profile', JSON.stringify(profile));
      }
      continue;
    }

    verbalResponse.push(line);
  }

  return {
    action: verbalResponse.length < lines.length ? 'command' : null,
    verbalResponse: verbalResponse.join('\n').trim(),
  };
}
