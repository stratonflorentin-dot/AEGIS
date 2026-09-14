import { useState, useEffect } from 'react';

export function useSystemStats() {
  const [stats, setStats] = useState({
    cpu: 0,
    ram: 0,
    network: 'ONLINE',
    latency: '0ms',
    battery: 100,
    cores: navigator.hardwareConcurrency || 4,
    memory: navigator.deviceMemory || '8GB'
  });

  useEffect(() => {
    const updateStats = () => {
      // Simulate dynamic CPU and RAM usage
      const baseCpu = 15;
      const baseRam = 45;
      
      setStats(prev => ({
        ...prev,
        cpu: Math.min(100, Math.max(0, baseCpu + (Math.random() * 10 - 5))),
        ram: Math.min(100, Math.max(0, baseRam + (Math.random() * 4 - 2))),
        latency: `${Math.floor(Math.random() * 50 + 10)}ms`,
        network: navigator.onLine ? 'ONLINE' : 'OFFLINE'
      }));
    };

    const interval = setInterval(updateStats, 2000);
    updateStats();

    // Battery API
    if (navigator.getBattery) {
      navigator.getBattery().then(battery => {
        const updateBattery = () => {
          setStats(prev => ({ ...prev, battery: Math.round(battery.level * 100) }));
        };
        battery.addEventListener('levelchange', updateBattery);
        updateBattery();
      });
    }

    return () => clearInterval(interval);
  }, []);

  return stats;
}
