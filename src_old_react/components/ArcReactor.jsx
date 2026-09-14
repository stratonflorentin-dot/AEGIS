import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const ArcReactor = ({ isActive }) => {
  const ringsRef = useRef([]);
  const coreRef = useRef(null);

  useEffect(() => {
    ringsRef.current.forEach((ring, i) => {
      gsap.to(ring, {
        rotation: (i % 2 === 0 ? 360 : -360),
        duration: 10 + (i * 2),
        repeat: -1,
        ease: "none"
      });
    });

    gsap.to(coreRef.current, {
      opacity: 0.5,
      scale: 0.9,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut"
    });
  }, []);

  useEffect(() => {
    if (isActive) {
      ringsRef.current.forEach((ring, i) => {
        gsap.to(ring, {
          timeScale: 5,
          duration: 0.5
        });
      });
      gsap.to(coreRef.current, {
        scale: 1.2,
        duration: 0.3,
        boxShadow: "0 0 40px var(--hud-primary)"
      });
    } else {
      ringsRef.current.forEach((ring, i) => {
        gsap.to(ring, {
          timeScale: 1,
          duration: 1
        });
      });
      gsap.to(coreRef.current, {
        scale: 1,
        duration: 0.5
      });
    }
  }, [isActive]);

  return (
    <div className="relative w-44 h-44 flex items-center justify-center">
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full blur-2xl opacity-20 bg-hud-primary" />
      
      {/* 5 Concentric Rings */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          ref={el => ringsRef.current[i] = el}
          className="absolute border-2 border-dashed rounded-full"
          style={{
            width: `${100 - (i * 15)}%`,
            height: `${100 - (i * 15)}%`,
            borderColor: i === 0 ? 'var(--hud-primary)' : 'var(--hud-secondary)',
            borderStyle: i % 2 === 0 ? 'dashed' : 'dotted',
            opacity: 0.7 - (i * 0.1),
            borderWidth: 2 + (i * 0.5)
          }}
        />
      ))}

      {/* Center Core */}
      <div
        ref={coreRef}
        className="w-12 h-12 bg-white rounded-full shadow-glow-lg flex items-center justify-center overflow-hidden"
        style={{ background: 'radial-gradient(circle, #fff 0%, var(--hud-primary) 70%)' }}
      >
        <div className="w-full h-full opacity-20 bg-hud-secondary animate-pulse" />
      </div>

      {/* Energy lines */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-full h-px bg-hud-primary"
            style={{ transform: `rotate(${i * 45}deg)` }}
          />
        ))}
      </div>
    </div>
  );
};

export default ArcReactor;
