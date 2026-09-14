import React, { useEffect, useRef } from 'react';

const VoiceEngine = ({ isListening, isSpeaking }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const bars = 64;
      const barWidth = canvas.width / bars;
      const time = Date.now() / 1000;
      
      ctx.beginPath();
      for (let i = 0; i < bars; i++) {
        let height = 0;
        
        if (isSpeaking) {
          // AEGIS speaking waveform (gold/orange)
          height = Math.sin(time * 10 + i * 0.2) * 20 + 25;
          ctx.fillStyle = 'var(--hud-gold)';
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'var(--hud-gold)';
        } else if (isListening) {
          // User speaking waveform (cyan)
          height = Math.sin(time * 15 + i * 0.5) * 15 + 20;
          ctx.fillStyle = 'var(--hud-primary)';
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'var(--hud-primary)';
        } else {
          // Idle waveform
          height = Math.sin(time * 2 + i * 0.1) * 2 + 5;
          ctx.fillStyle = 'var(--hud-primary)';
          ctx.shadowBlur = 5;
          ctx.shadowColor = 'rgba(0, 212, 255, 0.3)';
        }

        const x = i * barWidth;
        const y = (canvas.height - height) / 2;
        
        // Mirror effect
        ctx.fillRect(x, y, barWidth - 1, height);
      }
      
      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isListening, isSpeaking]);

  return (
    <div className="hud-panel p-2 flex items-center justify-center overflow-hidden h-20">
      <canvas ref={canvasRef} width={400} height={80} className="w-full h-full" />
    </div>
  );
};

export default VoiceEngine;
