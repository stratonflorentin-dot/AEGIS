import React from 'react';
import { APP_MAP, executeAppCommand } from '../utils/appCommands';

const QuickLaunch = () => {
  const apps = [
    { icon: '🌐', label: 'CHROME',    cmd: 'chrome' },
    { icon: '🎵', label: 'SPOTIFY',   cmd: 'spotify' },
    { icon: '💻', label: 'VS CODE',   cmd: 'vs code' },
    { icon: '📁', label: 'FILES',     cmd: 'explorer' },
    { icon: '💬', label: 'DISCORD',   cmd: 'discord' },
    { icon: '▶',  label: 'YOUTUBE',   cmd: 'youtube' },
    { icon: '📧', label: 'GMAIL',     cmd: 'gmail' },
    { icon: '🐙', label: 'GITHUB',    cmd: 'github' },
    { icon: '🤖', label: 'CHATGPT',   cmd: 'chatgpt' },
  ];

  const handleLaunch = (cmd) => {
    executeAppCommand('OPEN', cmd);
  };

  return (
    <div className="hud-panel p-4">
      <h3 className="text-[10px] font-hud mb-3 opacity-60 tracking-widest uppercase">Quick Launch</h3>
      <div className="grid grid-cols-3 gap-2">
        {apps.map((app) => (
          <button
            key={app.label}
            onClick={() => handleLaunch(app.cmd)}
            className="flex flex-col items-center justify-center p-2 rounded bg-white/5 border border-border-hud hover:bg-hud-primary/10 hover:border-hud-primary transition-all duration-200 group active:scale-95"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">{app.icon}</span>
            <span className="text-[8px] font-hud tracking-tighter opacity-60 group-hover:opacity-100">{app.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickLaunch;
