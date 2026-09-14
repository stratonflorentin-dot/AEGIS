import React from 'react';

const MemoryTimeline = ({ history }) => {
  return (
    <div className="hud-panel p-4 flex-1 overflow-hidden flex flex-col">
      <h3 className="text-[10px] font-hud mb-3 opacity-60 tracking-widest uppercase">Memory Log</h3>
      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide pr-2">
        {history.slice(-20).reverse().map((msg) => (
          <div key={msg.id} className="border-l border-border-hud pl-3 py-1 relative">
            <div className="absolute left-[-3px] top-1 w-1.5 h-1.5 rounded-full bg-hud-primary shadow-glow-sm" />
            <div className="text-[8px] font-hud opacity-40 uppercase">
              {new Date(msg.timestamp).toLocaleTimeString()} · {msg.role}
            </div>
            <div className="text-[10px] opacity-70 truncate">
              {msg.content}
            </div>
          </div>
        ))}
        {history.length === 0 && (
          <div className="text-[10px] opacity-30 font-hud text-center mt-10">
            LOGS EMPTY
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryTimeline;
