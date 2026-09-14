import React from 'react';

const SystemMetrics = ({ stats }) => {
  const Gauge = ({ label, value, color }) => (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-12 overflow-hidden">
        {/* Semicircle Track */}
        <div className="absolute w-24 h-24 border-[6px] border-hud-secondary opacity-20 rounded-full" />
        {/* Semicircle Fill */}
        <div 
          className="absolute w-24 h-24 border-[6px] rounded-full transition-all duration-500 ease-out"
          style={{ 
            borderColor: color,
            transform: `rotate(${-180 + (value * 1.8)}deg)`,
            clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)'
          }}
        />
        <div className="absolute bottom-0 w-full text-center text-[10px] font-hud tracking-tighter">
          {Math.round(value)}%
        </div>
      </div>
      <span className="text-[10px] font-hud mt-1 opacity-70 uppercase tracking-widest">{label}</span>
    </div>
  );

  return (
    <div className="hud-panel p-4 flex flex-col gap-4">
      <div className="flex justify-around">
        <Gauge label="CPU" value={stats.cpu} color="var(--hud-primary)" />
        <Gauge label="RAM" value={stats.ram} color="var(--hud-secondary)" />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-[10px] font-hud">
        <div className="flex justify-between items-center border-b border-border-hud pb-1">
          <span className="opacity-60">STATUS:</span>
          <span className="text-hud-success">{stats.network}</span>
        </div>
        <div className="flex justify-between items-center border-b border-border-hud pb-1">
          <span className="opacity-60">LATENCY:</span>
          <span>{stats.latency}</span>
        </div>
        <div className="flex justify-between items-center border-b border-border-hud pb-1">
          <span className="opacity-60">BATTERY:</span>
          <span className={stats.battery < 20 ? 'text-hud-danger' : 'text-hud-primary'}>
            {stats.battery}%
          </span>
        </div>
        <div className="flex justify-between items-center border-b border-border-hud pb-1">
          <span className="opacity-60">CORES:</span>
          <span>{stats.cores}</span>
        </div>
      </div>
    </div>
  );
};

export default SystemMetrics;
