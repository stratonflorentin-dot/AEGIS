import React, { useState, useEffect, useCallback, useRef } from 'react';
import { gsap } from 'gsap';
import HUD from './components/HUD';
import ArcReactor from './components/ArcReactor';
import ChatPanel from './components/ChatPanel';
import VoiceEngine from './components/VoiceEngine';
import TaskGraph from './components/TaskGraph';
import SystemMetrics from './components/SystemMetrics';
import QuickLaunch from './components/QuickLaunch';
import MemoryTimeline from './components/MemoryTimeline';
import AlertSystem from './components/AlertSystem';
import ScanLine from './components/ScanLine';

import { useAegis } from './hooks/useAegis';
import { useVoice } from './hooks/useVoice';
import { useSystemStats } from './hooks/useSystemStats';
import { useMemory } from './hooks/useMemory';

function APIKeyPanel() {
  const [key, setKey] = React.useState(localStorage.getItem('aegis_groq_key') || '');
  const [saved, setSaved] = React.useState(false);
  const [show, setShow] = React.useState(!localStorage.getItem('aegis_groq_key'));

  const save = () => {
    localStorage.setItem('aegis_groq_key', key.trim());
    setSaved(true);
    setShow(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      {/* Settings toggle button */}
      <button
        onClick={() => setShow(s => !s)}
        style={{
          position: 'fixed', top: 14, right: 14, zIndex: 10000,
          background: 'rgba(0,20,50,0.9)',
          border: '1px solid rgba(0,212,255,0.4)',
          color: '#00d4ff', cursor: 'pointer',
          fontFamily: 'Orbitron, monospace', fontSize: 10,
          letterSpacing: 2, padding: '6px 12px', borderRadius: 4,
          boxShadow: '0 0 12px rgba(0,212,255,0.2)'
        }}
      >
        ⚙ API KEY
      </button>

      {/* Settings panel */}
      {show && (
        <div style={{
          position: 'fixed', top: 48, right: 14, zIndex: 10000,
          background: 'rgba(0,10,30,0.97)',
          border: '1px solid rgba(0,212,255,0.5)',
          borderRadius: 8, padding: '16px 18px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 0 30px rgba(0,212,255,0.15)',
          width: 320,
        }}>
          <div style={{ color: '#00d4ff', fontFamily: 'Orbitron, monospace', fontSize: 11, letterSpacing: 3, marginBottom: 12 }}>
            NEURAL LINK CONFIGURATION
          </div>
          <div style={{ color: 'rgba(0,212,255,0.6)', fontSize: 11, marginBottom: 8 }}>
            Groq API Key (free at console.groq.com)
          </div>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxx"
            onKeyDown={e => e.key === 'Enter' && save()}
            style={{
              width: '100%', background: 'rgba(0,212,255,0.07)',
              border: '1px solid rgba(0,212,255,0.3)',
              color: '#00d4ff', fontFamily: 'monospace', fontSize: 12,
              padding: '8px 12px', borderRadius: 4, outline: 'none',
              marginBottom: 10
            }}
          />
          <button onClick={save} style={{
            width: '100%',
            background: saved ? 'rgba(0,255,136,0.15)' : 'rgba(0,212,255,0.12)',
            border: `1px solid ${saved ? '#00ff88' : 'rgba(0,212,255,0.4)'}`,
            color: saved ? '#00ff88' : '#00d4ff',
            fontFamily: 'Orbitron, monospace', fontSize: 11,
            letterSpacing: 2, padding: '8px', borderRadius: 4, cursor: 'pointer'
          }}>
            {saved ? '✓ NEURAL LINK ACTIVE' : 'ACTIVATE'}
          </button>
          <div style={{ color: 'rgba(0,212,255,0.4)', fontSize: 10, marginTop: 10, lineHeight: 1.5 }}>
            Get your FREE key at console.groq.com → API Keys → Create Key
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  const { history, addMessage } = useMemory();
  const [alerts, setAlerts] = useState([]);
  const [time, setTime] = useState(new Date());

  const addAlert = useCallback((message, type = 'INFO') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeAlert(id), type === 'DANGER' || type === 'WARN' ? 8000 : 4000);
  }, []);

  const removeAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const { isThinking, streamingText, sendMessage } = useAegis(addMessage);
  
  const handleVoiceResult = async (text) => {
    addMessage('user', text);
    const response = await sendMessage(text, history);
    if (response.verbalResponse) {
      speak(response.verbalResponse);
    }
    if (response.action) {
      addAlert(`${response.action}: ${response.appName} triggered.`, response.result?.success ? 'SUCCESS' : 'WARN');
    }
  };

  const { isListening, startListening, stopListening, speak, isSpeaking, getRandomIntro } = useVoice({
    onResult: handleVoiceResult,
    onError: (err) => addAlert(`Voice Error: ${err}`, 'DANGER')
  });

  const stats = useSystemStats();
  const headerRef = useRef(null);
  const leftPanelRef = useRef(null);
  const centerPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  const footerRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // Page load sequence
    const tl = gsap.timeline();
    tl.fromTo(headerRef.current, { y: -100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, delay: 0.2 })
      .fromTo(leftPanelRef.current, { x: -100, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8 }, 0.4)
      .fromTo(centerPanelRef.current, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.6)
      .fromTo(rightPanelRef.current, { x: 100, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8 }, 0.8)
      .fromTo(footerRef.current, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 1.0);

    // Initial greeting
    const greet = () => {
      const greeting = "AEGIS online. All systems operational. How can I assist you, Sir?";
      speak(greeting);
      addAlert("System Online", "SUCCESS");
    };
    
    const timeout = setTimeout(greet, 2000);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, []);

  const handleSendText = async (text) => {
    addMessage('user', text);
    const response = await sendMessage(text, history);
    if (response.verbalResponse) {
      speak(response.verbalResponse);
    }
    if (response.action) {
      addAlert(`${response.action}: ${response.appName} triggered.`, response.result?.success ? 'SUCCESS' : 'WARN');
    }
  };

  return (
    <HUD>
      <APIKeyPanel />
      <ScanLine />
      <AlertSystem alerts={alerts} removeAlert={removeAlert} />
      
      {/* Header Bar */}
      <header ref={headerRef} className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h1 className="text-3xl font-hud glow-text tracking-widest text-hud-primary">
            A.E.G.I.S.
          </h1>
          <span className="text-[10px] font-hud opacity-40 tracking-tighter uppercase">
            Autonomous Electronic Guardian & Intelligence System · v8.0.1
          </span>
        </div>

        <div className="flex gap-4">
          <StatusBadge label="ONLINE" color="bg-hud-success" />
          <StatusBadge label="AI READY" color="bg-hud-primary" />
          <StatusBadge label="VOICE ACTIVE" color={isListening ? "bg-hud-accent" : "bg-hud-secondary opacity-20"} />
          <StatusBadge label="ENCRYPTED" color="bg-hud-gold" />
        </div>

        <div className="flex flex-col items-end">
          <div className="text-2xl font-hud glow-text">
            {time.toLocaleTimeString([], { hour12: false })}
          </div>
          <div className="text-[10px] font-hud opacity-60 uppercase">
            {time.toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Left Column */}
        <div ref={leftPanelRef} className="col-span-3 flex flex-col gap-6">
          <div className="hud-panel p-4 flex items-center justify-center">
            <ArcReactor isActive={isSpeaking || isThinking} />
          </div>
          <SystemMetrics stats={stats} />
          <QuickLaunch />
        </div>

        {/* Center Column */}
        <div ref={centerPanelRef} className="col-span-6 flex flex-col gap-6">
          <ChatPanel 
            messages={history}
            isThinking={isThinking}
            streamingText={streamingText}
            onSendMessage={handleSendText}
            isListening={isListening}
            startListening={startListening}
            stopListening={stopListening}
          />
          <VoiceEngine isListening={isListening} isSpeaking={isSpeaking} />
        </div>

        {/* Right Column */}
        <div ref={rightPanelRef} className="col-span-3 flex flex-col gap-6">
          <TaskGraph />
          <MemoryTimeline history={history} />
          
          <div className="hud-panel p-4 mt-auto">
            <div className="flex justify-between items-center text-[10px] font-hud opacity-60 uppercase">
              <span>Uptime: 00:42:15</span>
              <span>AES-256 Bit</span>
            </div>
            <div className="mt-2 h-1 bg-hud-secondary/20 rounded-full overflow-hidden">
              <div className="h-full bg-hud-primary animate-[progress_20s_linear_infinite]" style={{ width: '65%' }} />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer ref={footerRef} className="mt-6 flex justify-between items-center text-[8px] font-hud opacity-30 tracking-[0.2em] uppercase">
        <span>&copy; 2026 AEGIS SYSTEMS - ALL RIGHTS RESERVED</span>
        <span>Neural Link: ESTABLISHED | Global Grid: CONNECTED | Protocol: AEGIS-1</span>
      </footer>

      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </HUD>
  );
}

const StatusBadge = ({ label, color }) => (
  <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-border-hud bg-bg-panel text-[10px] font-hud tracking-widest">
    <div className={`w-1.5 h-1.5 rounded-full ${color} shadow-glow-sm`} />
    <span className="opacity-80">{label}</span>
  </div>
);

export default App;
