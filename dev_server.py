import http.server
import socketserver
import socket
import os
import sys
import json
import base64
import subprocess
import platform
import threading
import time
import sqlite3
import urllib.request
import urllib.error
import urllib.parse
import re
import shutil
import webbrowser
import psutil
import traceback
from datetime import datetime

# Optional imports for media control
try:
    from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
    from comtypes import CLSCTX_ALL
    from ctypes import cast, POINTER
    HAS_PYCAW = True
except ImportError:
    HAS_PYCAW = False

try:
    import pygame
    pygame.mixer.init()
    HAS_PYGAME = True
except ImportError:
    HAS_PYGAME = False

# Optional imports for web tools and light desktop automation
try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False

try:
    import mss
    HAS_MSS = True
except ImportError:
    HAS_MSS = False

try:
    import pyperclip
    HAS_PYPERCLIP = True
except ImportError:
    HAS_PYPERCLIP = False

try:
    import pygetwindow as gw
    HAS_PYGETWINDOW = True
except ImportError:
    HAS_PYGETWINDOW = False

try:
    import screen_brightness_control as sbc
    HAS_BRIGHTNESS = True
except ImportError:
    HAS_BRIGHTNESS = False

try:
    import pytesseract
    HAS_PYTESSERACT = True
except ImportError:
    HAS_PYTESSERACT = False

import base64
import io
import fnmatch

PORT = 5001
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class SystemController:
    def __init__(self):
        self.task_log = []
        self.active_tasks = {}

    def log_task(self, task_name, status, details=""):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "task": task_name,
            "status": status,
            "details": details
        }
        self.task_log.append(entry)
        print(f"[SYSTEM LOG] {entry['timestamp']} - {task_name}: {status}")

    def manage_file(self, action, path, destination=None, content=None):
        try:
            if action == 'create':
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content or "")
                return True, f"File created at {path}"
            elif action == 'delete':
                if os.path.isdir(path):
                    shutil.rmtree(path)
                else:
                    os.remove(path)
                return True, f"Path {path} removed"
            elif action == 'move' or action == 'copy':
                if action == 'move':
                    shutil.move(path, destination)
                else:
                    if os.path.isdir(path):
                        shutil.copytree(path, destination)
                    else:
                        shutil.copy2(path, destination)
                return True, f"File {action}d to {destination}"
            return False, "Invalid file action"
        except Exception as e:
            return False, str(e)

    def search_files(self, pattern, base_dir=None, max_results=50):
        base_dir = base_dir or os.path.expanduser("~")
        if not pattern:
            return False, "pattern is required", []
        if not os.path.isdir(base_dir):
            return False, f"'{base_dir}' is not a directory", []
        # Forgiving matching: a bare name like "invoice" becomes "*invoice*" so callers
        # don't need to know glob syntax; explicit globs (e.g. "*.pdf") pass through untouched.
        if '*' not in pattern and '?' not in pattern:
            pattern = f"*{pattern}*"
        matches = []
        try:
            for root, dirs, files in os.walk(base_dir):
                # Skip common noise directories so a home-directory search doesn't churn forever.
                dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', '__pycache__', 'dist', 'build')]
                for name in files:
                    if fnmatch.fnmatch(name.lower(), pattern.lower()):
                        matches.append(os.path.join(root, name))
                        if len(matches) >= max_results:
                            return True, f"Found {len(matches)} match(es) (capped)", matches
            return True, f"Found {len(matches)} match(es)", matches
        except Exception as e:
            return False, str(e), matches

    def manage_power(self, action):
        if platform.system() != "Windows":
            return False, f"Power action '{action}' is only implemented on Windows."
        try:
            if action == 'shutdown':
                subprocess.run(['shutdown', '/s', '/t', '10'], check=True)
                return True, "Shutting down in 10 seconds. Run 'shutdown /a' to cancel."
            elif action == 'restart':
                subprocess.run(['shutdown', '/r', '/t', '10'], check=True)
                return True, "Restarting in 10 seconds. Run 'shutdown /a' to cancel."
            elif action == 'sleep':
                subprocess.run(['rundll32.exe', 'powrprof.dll,SetSuspendState', '0,1,0'], check=True)
                return True, "Sleeping now."
            elif action == 'lock':
                subprocess.run(['rundll32.exe', 'user32.dll,LockWorkStation'], check=True)
                return True, "Workstation locked."
            elif action == 'cancel':
                subprocess.run(['shutdown', '/a'], check=True)
                return True, "Pending shutdown/restart cancelled."
            return False, f"Invalid power action: {action}"
        except Exception as e:
            return False, str(e)

    def manage_app(self, action, app_name):
        try:
            if action == 'launch':
                if platform.system() == "Windows":
                    subprocess.Popen(f'start "" "{app_name}"', shell=True)
                else:
                    opener = "open" if platform.system() == "Darwin" else "xdg-open"
                    subprocess.Popen([opener, app_name])
                return True, f"Launching {app_name}"
            elif action == 'close':
                if platform.system() == "Windows":
                    # Try with .exe and without
                    subprocess.run(f"taskkill /F /IM {app_name}.exe", shell=True)
                    subprocess.run(f"taskkill /F /IM {app_name}", shell=True)
                else:
                    subprocess.run(["pkill", app_name])
                return True, f"Terminating {app_name}"
            return False, "Invalid app action"
        except Exception as e:
            return False, str(e)

    def manage_productivity(self, category, action, params):
        try:
            if category == 'email':
                to = params.get('to', '')
                subject = params.get('subject', '')
                body = params.get('body', '')
                mail_url = f"mailto:{to}?subject={urllib.parse.quote(subject)}&body={urllib.parse.quote(body)}"
                webbrowser.open(mail_url)
                return True, "Email client opened"
            elif category == 'document':
                # Create a simple text/markdown document and open it
                filename = params.get('name', 'document.txt')
                content = params.get('content', '')
                path = os.path.join(os.path.expanduser("~"), "Documents", filename)
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, 'w') as f:
                    f.write(content)
                if platform.system() == "Windows":
                    subprocess.Popen(f'start "" "{path}"', shell=True)
                else:
                    opener = "open" if platform.system() == "Darwin" else "xdg-open"
                    subprocess.Popen([opener, path])
                return True, f"Document created and opened: {path}"
            return False, "Invalid productivity category"
        except Exception as e:
            return False, str(e)

system_ctrl = SystemController()

class MediaController:
    def __init__(self):
        self.queue = []
        self.current_index = -1
        self.is_playing = False
        self.volume = 50
        self.repeat_mode = 'off' # off, track, all
        self.shuffle = False
        self.current_track_info = {}

    def set_volume(self, level):
        level = max(0, min(100, level))
        self.volume = level
        if HAS_PYCAW and platform.system() == "Windows":
            try:
                devices = AudioUtilities.GetSpeakers()
                interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
                volume = cast(interface, POINTER(IAudioEndpointVolume))
                # Unmute if muted
                if volume.GetMute():
                    volume.SetMute(0, None)
                # level is 0.0 to 1.0
                volume.SetMasterVolumeLevelScalar(level / 100.0, None)
                return True
            except Exception as e:
                print(f"[MEDIA] Volume error: {e}")
        return False

    def get_volume(self):
        if HAS_PYCAW and platform.system() == "Windows":
            try:
                devices = AudioUtilities.GetSpeakers()
                interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
                volume = cast(interface, POINTER(IAudioEndpointVolume))
                return int(volume.GetMasterVolumeLevelScalar() * 100)
            except:
                pass
        return self.volume

    def play_local(self, path):
        if not HAS_PYGAME:
            return False, "Pygame not installed"
        
        # Resolve path - check absolute or relative to CWD
        full_path = path
        if not os.path.isabs(path):
            full_path = os.path.join(os.getcwd(), path)

        if not os.path.exists(full_path):
            # Try searching in common music directories
            music_dirs = [
                os.path.join(os.path.expanduser("~"), "Music"),
                DIRECTORY
            ]
            for d in music_dirs:
                test_path = os.path.join(d, path)
                if os.path.exists(test_path):
                    full_path = test_path
                    break
        
        if not os.path.exists(full_path):
            return False, f"File not found: {path}"

        try:
            pygame.mixer.music.load(full_path)
            pygame.mixer.music.play()
            self.is_playing = True
            self.current_track_info = {"title": os.path.basename(full_path), "source": "local", "path": full_path}
            return True, f"Playing {os.path.basename(full_path)}"
        except Exception as e:
            return False, str(e)

    def pause(self):
        if HAS_PYGAME:
            pygame.mixer.music.pause()
            self.is_playing = False
            return True
        return False

    def resume(self):
        if HAS_PYGAME:
            pygame.mixer.music.unpause()
            self.is_playing = True
            return True
        return False

media_ctrl = MediaController()

class WebController:
    USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

    def search(self, query, max_results=5):
        if not HAS_BS4:
            return False, "beautifulsoup4 not installed (pip install -r requirements.txt)", []
        try:
            data = urllib.parse.urlencode({'q': query}).encode('utf-8')
            req = urllib.request.Request(
                'https://html.duckduckgo.com/html/',
                data=data,
                headers={
                    'User-Agent': self.USER_AGENT,
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                html = response.read().decode('utf-8', errors='ignore')

            soup = BeautifulSoup(html, 'html.parser')
            links = soup.select('a.result__a')
            if not links:
                # DuckDuckGo occasionally serves a bot-detection challenge page instead of results.
                return False, "Search returned no results (DuckDuckGo may be rate-limiting this connection).", []

            results = []
            for a in links[:max_results]:
                title = a.get_text(strip=True)
                url = a.get('href', '')
                snippet_el = a.find_parent('div', class_='result__body')
                snippet = ''
                if snippet_el:
                    snippet_a = snippet_el.select_one('a.result__snippet')
                    if snippet_a:
                        snippet = snippet_a.get_text(strip=True)
                if title and url:
                    results.append({'title': title, 'url': url, 'snippet': snippet})
            return True, f"Found {len(results)} results", results
        except Exception as e:
            return False, str(e), []

    def fetch(self, url, max_chars=8000):
        if not HAS_BS4:
            return False, "beautifulsoup4 not installed (pip install -r requirements.txt)", None
        try:
            req = urllib.request.Request(url, headers={'User-Agent': self.USER_AGENT})
            with urllib.request.urlopen(req, timeout=15) as response:
                html = response.read().decode('utf-8', errors='ignore')

            soup = BeautifulSoup(html, 'html.parser')
            for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'noscript']):
                tag.decompose()
            title = soup.title.get_text(strip=True) if soup.title else ''
            text = re.sub(r'\n{3,}', '\n\n', soup.get_text('\n', strip=True))
            return True, "OK", {'title': title, 'text': text[:max_chars]}
        except Exception as e:
            return False, str(e), None

web_ctrl = WebController()

class WeatherController:
    def get(self, location):
        if not location:
            return False, "location is required", None
        try:
            url = f"https://wttr.in/{urllib.parse.quote(location)}?format=j1"
            req = urllib.request.Request(url, headers={'User-Agent': WebController.USER_AGENT})
            with urllib.request.urlopen(req, timeout=15) as response:
                data = json.loads(response.read().decode('utf-8', errors='ignore'))
            current = data['current_condition'][0]
            area = data.get('nearest_area', [{}])[0]
            place = ', '.join(filter(None, [
                area.get('areaName', [{}])[0].get('value'),
                area.get('country', [{}])[0].get('value'),
            ])) or location
            summary = {
                'location': place,
                'temperature_c': current.get('temp_C'),
                'feels_like_c': current.get('FeelsLikeC'),
                'condition': current.get('weatherDesc', [{}])[0].get('value'),
                'humidity_percent': current.get('humidity'),
                'wind_kmph': current.get('windspeedKmph'),
            }
            return True, "OK", summary
        except Exception as e:
            return False, str(e), None

weather_ctrl = WeatherController()

class AutomationController:
    def screenshot(self):
        if not HAS_MSS:
            return False, "mss not installed (pip install -r requirements.txt)", None
        try:
            with mss.MSS() as sct:
                monitor = sct.monitors[1] if len(sct.monitors) > 1 else sct.monitors[0]
                shot = sct.grab(monitor)
                png_bytes = mss.tools.to_png(shot.rgb, shot.size)
                b64 = base64.b64encode(png_bytes).decode('ascii')
                return True, "Captured", {'image_base64': b64, 'width': shot.size[0], 'height': shot.size[1]}
        except Exception as e:
            return False, str(e), None

    def clipboard_read(self):
        if not HAS_PYPERCLIP:
            return False, "pyperclip not installed (pip install -r requirements.txt)", None
        try:
            return True, "OK", pyperclip.paste()
        except Exception as e:
            return False, str(e), None

    def clipboard_write(self, text):
        if not HAS_PYPERCLIP:
            return False, "pyperclip not installed (pip install -r requirements.txt)", None
        try:
            pyperclip.copy(text or '')
            return True, "Copied to clipboard", None
        except Exception as e:
            return False, str(e), None

    def window(self, action, title):
        if not HAS_PYGETWINDOW:
            return False, "pygetwindow not installed (pip install -r requirements.txt)"
        try:
            if action == 'list':
                return True, [w.title for w in gw.getAllWindows() if w.title.strip()]
            matches = gw.getWindowsWithTitle(title) if title else []
            if not matches:
                return False, f"No window found matching '{title}'"
            win = matches[0]
            if action == 'focus':
                win.activate()
            elif action == 'minimize':
                win.minimize()
            elif action == 'maximize':
                win.maximize()
            elif action == 'close':
                win.close()
            else:
                return False, f"Invalid window action: {action}"
            return True, f"{action} -> {win.title}"
        except Exception as e:
            return False, str(e)

    def brightness(self, action, level=None):
        if not HAS_BRIGHTNESS:
            return False, "screen_brightness_control not installed (pip install -r requirements.txt)", None
        try:
            if action == 'get':
                return True, "OK", sbc.get_brightness()
            if action == 'set':
                if level is None:
                    return False, "level (0-100) is required", None
                sbc.set_brightness(max(0, min(100, int(level))))
                return True, f"Brightness set to {level}%", None
            return False, f"Invalid brightness action: {action}", None
        except Exception as e:
            return False, str(e), None

    def ocr(self, image_base64=None):
        if not HAS_PYTESSERACT:
            return False, "pytesseract not installed (pip install -r requirements.txt)", None
        try:
            from PIL import Image
            if image_base64 is None:
                success, message, shot = self.screenshot()
                if not success:
                    return False, message, None
                image_base64 = shot['image_base64']
            img = Image.open(io.BytesIO(base64.b64decode(image_base64)))
            text = pytesseract.image_to_string(img)
            return True, "OK", text.strip()
        except pytesseract.TesseractNotFoundError:
            return False, (
                "The Tesseract OCR engine isn't installed on this PC (pytesseract is just a Python "
                "wrapper for it). Install it from https://github.com/UB-Mannheim/tesseract/wiki "
                "(Windows) and make sure it's on PATH, then try again."
            ), None
        except Exception as e:
            return False, str(e), None

automation_ctrl = AutomationController()

MEMORY_DB_PATH = os.path.join(DIRECTORY, 'tony_memory.db')

class MemoryManager:
    """Bridge-authoritative categorized memory: identity, preferences, projects,
    relationships, notes. Reuses tony_memory.db's existing (previously unwired) `facts`
    table so memory persists across restarts and is shared by any device that connects
    to this bridge, not just one browser's localStorage."""

    def __init__(self, db_path):
        self.db_path = db_path
        self._init_schema()

    def _connect(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self):
        conn = self._connect()
        try:
            conn.execute('''CREATE TABLE IF NOT EXISTS facts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                confidence REAL DEFAULT 1.0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )''')
            # Re-remembering the same (category, key) updates in place instead of duplicating rows.
            conn.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_facts_cat_key ON facts(category, key)')
            conn.commit()
        finally:
            conn.close()

    def remember(self, category, key, value):
        if not key or value is None or value == '':
            return False, "Both key and value are required"
        conn = self._connect()
        try:
            conn.execute('''
                INSERT INTO facts (category, key, value, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(category, key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
            ''', (category or 'notes', key, str(value)))
            conn.commit()
            return True, f"Remembered {category or 'notes'}:{key}"
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()

    def recall(self, category=None, query=None, limit=50):
        conn = self._connect()
        try:
            sql = 'SELECT category, key, value, updated_at FROM facts WHERE 1=1'
            params = []
            if category:
                sql += ' AND category = ?'
                params.append(category)
            if query:
                sql += ' AND (key LIKE ? OR value LIKE ?)'
                like = f'%{query}%'
                params.extend([like, like])
            sql += ' ORDER BY updated_at DESC LIMIT ?'
            params.append(limit)
            rows = conn.execute(sql, params).fetchall()
            return True, [dict(r) for r in rows]
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()

    def forget(self, category, key):
        conn = self._connect()
        try:
            cur = conn.execute('DELETE FROM facts WHERE category = ? AND key = ?', (category, key))
            conn.commit()
            return True, f"Deleted {cur.rowcount} fact(s)"
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()

    def summary(self, limit=15):
        success, rows = self.recall(limit=limit)
        if not success or not rows:
            return ""
        return "; ".join(f"[{r['category']}] {r['key']}: {r['value']}" for r in rows)

memory_mgr = MemoryManager(MEMORY_DB_PATH)

class ReminderManager:
    """One-shot proactive reminders, reusing tony_memory.db's existing (previously unwired)
    `reminders` table. The frontend polls /reminders {action:'check'} periodically; due
    reminders are returned once and marked inactive so they don't repeat."""

    def __init__(self, db_path):
        self.db_path = db_path

    def _connect(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def add(self, message, reminder_time):
        if not message or not reminder_time:
            return False, "Both message and when (ISO datetime) are required"
        conn = self._connect()
        try:
            conn.execute(
                'INSERT INTO reminders (message, reminder_time, is_active) VALUES (?, ?, 1)',
                (message, reminder_time),
            )
            conn.commit()
            return True, f"Reminder set for {reminder_time}"
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()

    def due(self):
        conn = self._connect()
        try:
            rows = conn.execute(
                "SELECT id, message, reminder_time FROM reminders WHERE is_active = 1 AND reminder_time <= ? ORDER BY reminder_time",
                (datetime.now().isoformat(),),
            ).fetchall()
            if rows:
                ids = [r['id'] for r in rows]
                conn.execute(f"UPDATE reminders SET is_active = 0 WHERE id IN ({','.join('?' * len(ids))})", ids)
                conn.commit()
            return [dict(r) for r in rows]
        finally:
            conn.close()

reminder_mgr = ReminderManager(MEMORY_DB_PATH)

GROQ_KEY_FILE = os.path.join(DIRECTORY, 'groq_key.local')

def read_local_groq_key():
    """Read the optional git-ignored groq_key.local file (one line: the API key)."""
    try:
        with open(GROQ_KEY_FILE, 'r', encoding='utf-8') as f:
            return f.read().strip() or None
    except OSError:
        return None

ELEVENLABS_KEY_FILE = os.path.join(DIRECTORY, 'elevenlabs_key.local')

def read_local_elevenlabs():
    """Read the optional git-ignored elevenlabs_key.local file:
    line 1 = API key, line 2 = voice ID. Returns (key, voice), either may be None."""
    try:
        with open(ELEVENLABS_KEY_FILE, 'r', encoding='utf-8') as f:
            lines = [ln.strip() for ln in f.read().splitlines() if ln.strip()]
        key = lines[0] if len(lines) > 0 else None
        voice = lines[1] if len(lines) > 1 else None
        return key, voice
    except OSError:
        return None, None

# --- Keyboard automation (Windows: PowerShell SendKeys) -----------------------

_SENDKEYS_SPECIALS = '+^%~(){}[]'

def _sendkeys_escape(text):
    """Escape a plain string for Windows Forms SendKeys, preserving newlines/tabs."""
    out = []
    for ch in text:
        if ch == '\r':
            continue
        if ch == '\n':
            out.append('{ENTER}')
        elif ch == '\t':
            out.append('{TAB}')
        elif ch in _SENDKEYS_SPECIALS:
            out.append('{' + ch + '}')
        else:
            out.append(ch)
    return ''.join(out)

_SENDKEY_KEY_CODES = {
    'enter': '{ENTER}', 'return': '{ENTER}', 'esc': '{ESC}', 'escape': '{ESC}',
    'tab': '{TAB}', 'space': ' ', 'backspace': '{BACKSPACE}', 'delete': '{DELETE}',
    'del': '{DELETE}', 'insert': '{INSERT}', 'up': '{UP}', 'down': '{DOWN}',
    'left': '{LEFT}', 'right': '{RIGHT}', 'home': '{HOME}', 'end': '{END}',
    'pageup': '{PGUP}', 'pagedown': '{PGDN}', 'printscreen': '{PRTSC}',
}
for _n in range(1, 13):
    _SENDKEY_KEY_CODES[f'f{_n}'] = '{F%d}' % _n

def _send_powershell_keys(keys_expr):
    """Run a SendKeys expression in a fresh PowerShell process (Unicode-safe via -EncodedCommand)."""
    ps = ("Add-Type -AssemblyName System.Windows.Forms; "
          "[System.Windows.Forms.SendKeys]::SendWait('%s')" % keys_expr.replace("'", "''"))
    encoded = base64.b64encode(ps.encode('utf-16-le')).decode('ascii')
    subprocess.run(['powershell', '-NoProfile', '-EncodedCommand', encoded],
                   check=True, timeout=15, capture_output=True, text=True)

def type_text(text, press_enter=False):
    """Type text into the currently focused window (works for chat apps, forms, editors)."""
    if not text:
        return False, 'No text provided.'
    try:
        _send_powershell_keys(_sendkeys_escape(text))
        if press_enter:
            _send_powershell_keys('{ENTER}')
        return True, f'Typed {len(text)} characters.'
    except subprocess.TimeoutExpired:
        return False, 'Typing timed out.'
    except subprocess.CalledProcessError as e:
        return False, f'Typing failed: {(e.stderr or e.stdout or "unknown error").strip()[:200]}'
    except FileNotFoundError:
        return False, 'Typing requires Windows (PowerShell).'

def press_key(key):
    """Press a single key (enter, esc, tab, arrows, f1-f12, letters/digits) in the focused window."""
    k = (key or '').strip().lower()
    if not k:
        return False, 'No key provided.'
    code = _SENDKEY_KEY_CODES.get(k)
    if code is None and len(k) == 1 and (k.isalnum() or k in ' ./-_=+'):
        code = k
    if code is None:
        return False, f'Unsupported key: "{key}".'
    try:
        _send_powershell_keys(code)
        return True, f'Pressed {k}.'
    except subprocess.TimeoutExpired:
        return False, 'Key press timed out.'
    except subprocess.CalledProcessError as e:
        return False, f'Key press failed: {(e.stderr or e.stdout or "unknown error").strip()[:200]}'
    except FileNotFoundError:
        return False, 'Key presses require Windows (PowerShell).'

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        try:
            self._handle_post()
        except Exception as e:
            print(f"[ERROR] Unhandled exception in do_POST ({self.path}): {e}")
            traceback.print_exc()
            try:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": {"message": f"Malformed request: {e}"}}).encode())
            except Exception:
                pass  # connection already broken/headers already sent — nothing more to do

    def _handle_post(self):
        # Normalize path by removing trailing slashes
        path = self.path.rstrip('/')
        if not path.startswith('/'):
            path = '/' + path

        if path == '/execute':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            command = data.get('command', '')
            
            print(f"[EXEC] Received local execution request: {command}")
            
            try:
                if command == 'sys_info':
                    info = {
                        "platform": platform.system(),
                        "release": platform.release(),
                        "processor": platform.processor(),
                        "cwd": os.getcwd(),
                        "python_version": sys.version,
                        "time": time.ctime(),
                        "cpu_count": psutil.cpu_count(),
                        "memory_total": psutil.virtual_memory().total
                    }
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "data": info}).encode())
                    return

                if command == 'metrics':
                    metrics = {
                        "cpu_percent": psutil.cpu_percent(interval=None),
                        "memory_percent": psutil.virtual_memory().percent,
                        "disk_usage": psutil.disk_usage('/').percent,
                        "boot_time": psutil.boot_time()
                    }
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "data": metrics}).encode())
                    return

                if command == 'logs':
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "logs": system_ctrl.task_log}).encode())
                    return

                if command.startswith('shell:'):
                    shell_cmd = command.replace('shell:', '').strip()
                    print(f"[SHELL] Executing: {shell_cmd}")
                    # Execute and capture output
                    result = subprocess.run(shell_cmd, shell=True, capture_output=True, text=True, timeout=10)
                    output = result.stdout if result.stdout else result.stderr
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "output": output}).encode())
                    return

                if platform.system() == "Windows":
                    # Use 'start' to open files/apps based on association
                    subprocess.Popen(f'start "" "{command}"', shell=True)
                else:
                    # macOS/Linux equivalents
                    opener = "open" if platform.system() == "Darwin" else "xdg-open"
                    subprocess.Popen([opener, command])
                
                self.send_response(200)
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": f"Opening {command}, Boss."}).encode())
            except Exception as e:
                print(f"[ERROR] Execution failed: {e}")
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
        
        elif path == '/media':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            action = data.get('action', '')
            
            print(f"[MEDIA] Action: {action}")
            
            res = {"success": False}
            if action == 'set_volume':
                res["success"] = media_ctrl.set_volume(data.get('level', 50))
            elif action == 'get_volume':
                res["success"] = True
                res["level"] = media_ctrl.get_volume()
            elif action == 'play':
                path_to_play = data.get('path')
                if path_to_play:
                    success, msg = media_ctrl.play_local(path_to_play)
                    res["success"] = success
                    res["message"] = msg
                else:
                    res["success"] = media_ctrl.resume()
            elif action == 'pause':
                res["success"] = media_ctrl.pause()
            elif action == 'stop':
                if HAS_PYGAME:
                    pygame.mixer.music.stop()
                    res["success"] = True
            
            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        elif path == '/proxy':
            # Proxy request to Groq API to avoid CORS/Network issues
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            groq_url = 'https://api.groq.com/openai/v1/chat/completions'
            
            # Extract authorization from request headers
            auth_header = self.headers.get('Authorization', '')
            
            # Use specific headers for Groq API
            groq_headers = {
                'Content-Type': 'application/json',
                'Authorization': auth_header,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            
            print(f"[PROXY] Forwarding request to Groq API...")
            
            try:
                # Use a proper context for SSL if needed, though default is usually fine
                req = urllib.request.Request(groq_url, data=post_data, headers=groq_headers, method='POST')
                with urllib.request.urlopen(req, timeout=30) as response:
                    res_data = response.read()
                    self.send_response(response.getcode())
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(res_data)
                    print(f"[PROXY] Success: 200 OK")
            except urllib.error.HTTPError as e:
                err_body = e.read()
                print(f"[PROXY] Groq API error: {e.code} - {err_body.decode('utf-8', errors='ignore')}")
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(err_body)
            except Exception as e:
                print(f"[PROXY] Connection error: {str(e)}")
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": {"message": f"Bridge Connection Failed: {str(e)}"}}).encode())

        elif path == '/search_music':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            query = data.get('query', '')
            
            print(f"[SEARCH] Searching YouTube for: {query}")
            
            try:
                # Use a more specific search query for better results
                search_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query + ' audio')}"
                req = urllib.request.Request(search_url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9'
                })
                with urllib.request.urlopen(req, timeout=15) as response:
                    html = response.read().decode('utf-8', errors='ignore')
                    
                    # SYSTEMATIC EXTRACTION: Try multiple patterns as YouTube HTML structure varies
                    patterns = [
                        r'"videoId":"([^"]+)"',
                        r'watch\?v=([a-zA-Z0-9_-]{11})',
                        r'\/vi\/([a-zA-Z0-9_-]{11})'
                    ]
                    
                    video_id = None
                    for pattern in patterns:
                        match = re.search(pattern, html)
                        if match:
                            video_id = match.group(1)
                            # Validate length (YouTube IDs are 11 chars)
                            if len(video_id) == 11:
                                break
                            else:
                                video_id = None
                    
                    if video_id:
                        print(f"[SEARCH] Success! Found Video ID: {video_id}")
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps({"success": True, "videoId": video_id}).encode())
                    else:
                        print("[SEARCH] Warning: No valid Video ID found in response.")
                        self.send_response(404)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps({"success": False, "error": {"message": "Neural scan returned no valid stream identifiers."}}).encode())
            except Exception as e:
                print(f"[SEARCH] Critical Error: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": {"message": f"Search Matrix Failure: {str(e)}"}}).encode())

        elif path == '/system':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            category = data.get('category', '')
            action = data.get('action', '')
            
            system_ctrl.log_task(f"{category}:{action}", "STARTED")
            
            res = {"success": False}
            if category == 'file':
                success, msg = system_ctrl.manage_file(
                    action, 
                    data.get('path'), 
                    data.get('destination'), 
                    data.get('content')
                )
                res = {"success": success, "message": msg}
            elif category == 'app':
                success, msg = system_ctrl.manage_app(action, data.get('app_name'))
                res = {"success": success, "message": msg}
            elif category == 'power':
                success, msg = system_ctrl.manage_power(action)
                res = {"success": success, "message": msg}
            elif category == 'browser':
                try:
                    webbrowser.open(data.get('url', 'https://google.com'))
                    res = {"success": True, "message": "Browser command executed"}
                except Exception as e:
                    res = {"success": False, "error": {"message": str(e)}}
            elif category == 'productivity':
                # Fix: Passing 3 arguments to manage_productivity
                success, msg = system_ctrl.manage_productivity(action, None, data.get('params', {}))
                res = {"success": success, "message": msg}
            
            system_ctrl.log_task(f"{category}:{action}", "COMPLETED" if res["success"] else "FAILED", res.get("message") or res.get("error"))

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        elif path == '/web_search':
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            query = data.get('query', '')
            print(f"[WEB] Searching: {query}")
            success, message, results = web_ctrl.search(query)
            res = {"success": success, "message": message, "results": results}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        elif path == '/fetch_url':
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            url = data.get('url', '')
            print(f"[WEB] Fetching: {url}")
            success, message, page = web_ctrl.fetch(url)
            res = {"success": success, "message": message, "page": page}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        elif path == '/screenshot':
            print("[AUTOMATION] Capturing screenshot")
            success, message, shot = automation_ctrl.screenshot()
            res = {"success": success, "message": message, **(shot or {})}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        elif path == '/clipboard':
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            action = data.get('action', 'read')
            print(f"[AUTOMATION] Clipboard: {action}")
            if action == 'write':
                success, message, _ = automation_ctrl.clipboard_write(data.get('text', ''))
                res = {"success": success, "message": message}
            else:
                success, message, text = automation_ctrl.clipboard_read()
                res = {"success": success, "message": message, "text": text}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        elif path == '/window':
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            action = data.get('action', 'list')
            title = data.get('title', '')
            print(f"[AUTOMATION] Window: {action} '{title}'")
            success, result = automation_ctrl.window(action, title)
            res = {"success": success}
            if action == 'list':
                res["windows"] = result if success else []
                if not success:
                    res["message"] = result
            else:
                res["message"] = result
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        elif path == '/memory':
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            action = data.get('action', 'recall')
            print(f"[MEMORY] Action: {action}")

            if action == 'remember':
                success, message = memory_mgr.remember(data.get('category'), data.get('key'), data.get('value'))
                res = {"success": success, "message": message}
            elif action == 'recall':
                success, result = memory_mgr.recall(data.get('category'), data.get('query'))
                res = {"success": success, "facts": result if success else [], "message": None if success else result}
            elif action == 'forget':
                success, message = memory_mgr.forget(data.get('category'), data.get('key'))
                res = {"success": success, "message": message}
            elif action == 'summary':
                res = {"success": True, "summary": memory_mgr.summary()}
            else:
                res = {"success": False, "message": f"Invalid memory action: {action}"}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        elif path == '/reminders':
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            action = data.get('action', 'check')

            if action == 'set':
                success, message = reminder_mgr.add(data.get('message'), data.get('when'))
                res = {"success": success, "message": message}
            elif action == 'check':
                due = reminder_mgr.due()
                res = {"success": True, "due": due}
            else:
                res = {"success": False, "message": f"Invalid reminders action: {action}"}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        elif path == '/weather':
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            location = data.get('location', '')
            print(f"[WEATHER] Location: {location}")
            success, message, weather = weather_ctrl.get(location)
            res = {"success": success, "message": message, "weather": weather}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        elif path == '/file_search':
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            pattern = data.get('pattern', '')
            base_dir = data.get('base_dir')
            print(f"[FILE] Searching for: {pattern} in {base_dir or '~'}")
            success, message, matches = system_ctrl.search_files(pattern, base_dir)
            res = {"success": success, "message": message, "matches": matches}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        elif path == '/brightness':
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            action = data.get('action', 'get')
            print(f"[AUTOMATION] Brightness: {action}")
            success, message, level = automation_ctrl.brightness(action, data.get('level'))
            res = {"success": success, "message": message, "level": level}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        elif path == '/ocr':
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            print("[AUTOMATION] OCR requested")
            success, message, text = automation_ctrl.ocr(data.get('image_base64'))
            res = {"success": success, "message": message, "text": text}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        elif path == '/type_text':
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            text = data.get('text', '')
            press_enter = bool(data.get('press_enter', False))
            print(f"[AUTOMATION] Type text ({len(text)} chars, enter={press_enter})")
            success, message = type_text(text, press_enter)
            res = {"success": success, "message": message}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        elif path == '/press_key':
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            key = data.get('key', '')
            print(f"[AUTOMATION] Press key: {key}")
            success, message = press_key(key)
            res = {"success": success, "message": message}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode())

        else:
            print(f"[404] Route not found: {self.path}")
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": {"message": f"Interface route '{self.path}' rejected request (Not Found)."}}).encode())

    def do_GET(self):
        if self.path == '/':
            # The holographic build (npm run build -> dist/) is the primary UI;
            # fall back to the legacy single-file HUD when dist/ hasn't been built.
            if os.path.isfile(os.path.join(DIRECTORY, 'dist', 'index.html')):
                self.path = '/dist/index.html'
            else:
                self.path = '/aegis_standalone.html'
        else:
            # Build-time copies mean a single flat URL namespace maps to three real
            # locations: the repo root (legacy HUD), dist/ (holographic build assets),
            # and public/ (icons/manifest copied to dist root at build time). Try them
            # in that order and serve whichever actually has the file.
            requested = os.path.join(DIRECTORY, self.path.lstrip('/'))
            if not os.path.isfile(requested):
                dist_path = os.path.join(DIRECTORY, 'dist', self.path.lstrip('/'))
                public_path = os.path.join(DIRECTORY, 'public', self.path.lstrip('/'))
                if os.path.isfile(dist_path):
                    self.path = '/dist' + self.path
                elif os.path.isfile(public_path):
                    self.path = '/public' + self.path
        # Zero-config API keys: when git-ignored *.local files sit next to this script,
        # inject them into the served HUD (window.AEGIS_GROQ_KEY, window.AEGIS_ELEVENLABS_KEY,
        # window.AEGIS_ELEVENLABS_VOICE) so the local console works without pasting keys in
        # Settings. Keys only travel to clients this bridge already serves; never committed.
        if self.path == '/aegis_standalone.html':
            injections = []
            groq_key = read_local_groq_key()
            if groq_key:
                injections.append('window.AEGIS_GROQ_KEY = %s;' % json.dumps(groq_key))
            el_key, el_voice = read_local_elevenlabs()
            if el_key:
                injections.append('window.AEGIS_ELEVENLABS_KEY = %s;' % json.dumps(el_key))
            if el_voice:
                injections.append('window.AEGIS_ELEVENLABS_VOICE = %s;' % json.dumps(el_voice))
            if injections:
                html_path = os.path.join(DIRECTORY, 'aegis_standalone.html')
                try:
                    with open(html_path, 'r', encoding='utf-8') as f:
                        html = f.read()
                    injection = '<script>%s</script>' % '\n'.join(injections)
                    if '</head>' in html:
                        html = html.replace('</head>', injection + '\n</head>', 1)
                    else:
                        html = injection + '\n' + html
                    payload = html.encode('utf-8')
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                    self.send_header('Content-Length', str(len(payload)))
                    self.end_headers()
                    self.wfile.write(payload)
                    return
                except OSError as e:
                    print(f"[WARN] key injection failed, serving static file instead: {e}")
        return super().do_GET()

def validate_environment():
    """Strictly prohibit loopback addresses in configuration."""
    forbidden = ['localhost', '127.0.0.1', '::1', '[::1]']
    
    # Check VITE_BRIDGE_URL in .env if it exists
    env_path = os.path.join(DIRECTORY, '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if 'VITE_BRIDGE_URL' in line:
                    val = line.split('=')[1].strip()
                    if any(f in val.lower() for f in forbidden):
                        print(f"\n[FATAL ERROR] SECURITY POLICY VIOLATION")
                        print(f"Configuration target '{val}' is a prohibited loopback address.")
                        print("Please use a proper domain name or local network IP.")
                        sys.exit(1)

if __name__ == "__main__":
    validate_environment()
    
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    # Strictly prohibit binding to 127.0.0.1
    BIND_ADDRESS = "0.0.0.0" # Listen on all interfaces
    
    print("\n" + "="*50)
    print("   AEGIS NEURAL BRIDGE - CORE INITIALIZATION")
    print("="*50)
    print(f"HUD_PATH: {DIRECTORY}")
    print(f"PORT:     {PORT}")
    print(f"LOCAL IP: {local_ip}")
    print(f"BINDING:  {BIND_ADDRESS}")
    print(f"OS:       {platform.system()} {platform.release()}")
    print("-"*50)
    print("\n[SECURITY PROTOCOL]")
    print("Loopback addresses (localhost/127.0.0.1) are strictly prohibited.")
    print(f"Access this bridge via: http://{local_ip}:{PORT}")
    print("\n[STATUS] Neural bridge online and standing by...\n")

    try:
        # Bind to 0.0.0.0 instead of empty string (which can resolve to localhost)
        with socketserver.TCPServer((BIND_ADDRESS, PORT), MyHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[OFFLINE] Neural bridge deactivated. Goodnight, Boss.")
        sys.exit(0)
    except Exception as e:
        print(f"[ERROR] Failed to start server: {e}")
        sys.exit(1)
