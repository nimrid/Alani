import React, { useMemo } from 'react';
import { usePossessionStore, useScoreStore, PossessionType } from '@/store/matchStore';
import { useConnectionStore } from '@/store/connectionStore';

function getPossessionConfig(type: PossessionType, goalImminent: boolean, connected: boolean) {
  if (!connected) {
    return {
      color: 'var(--color-text-muted)',
      pulseClass: 'animate-pulse opacity-50',
      ringOpacity: 0.3,
      label: 'WAITING',
      glow: 'none',
      glowBlur: '0px',
      labelStyle: 'text-lg text-text-muted',
      innerRingSpin: false,
    };
  }

  if (goalImminent) {
    // Goal impending overrides the possession state
    return {
      color: 'var(--color-goal)',
      pulseClass: 'pulse-high-danger',
      ringOpacity: 1.0,
      label: '⚡ INCOMING',
      glow: 'radial-gradient(circle, rgba(255,215,0,0.5) 0%, rgba(255,215,0,0) 70%)',
      glowBlur: '120px',
      labelStyle: 'text-3xl font-bold uppercase text-[#FFD700]',
      innerRingSpin: true,
    };
  }

  switch (type) {
    case 'SafePossession':
    case 'None':
      return {
        color: 'var(--color-safe)',
        pulseClass: 'pulse-safe',
        ringOpacity: 0.3,
        label: type === 'None' ? 'WAITING' : 'SAFE',
        glow: 'none',
        glowBlur: '0px',
        labelStyle: 'text-lg text-safe',
        innerRingSpin: false,
      };
    case 'AttackPossession':
      return {
        color: 'var(--color-attack)',
        pulseClass: 'pulse-attack',
        ringOpacity: 0.5,
        label: 'BUILDING',
        glow: 'radial-gradient(circle, rgba(196,125,26,0.2) 0%, rgba(196,125,26,0) 70%)',
        glowBlur: '80px',
        labelStyle: 'text-xl font-semibold text-attack',
        innerRingSpin: false,
      };
    case 'DangerPossession':
      return {
        color: 'var(--color-danger)',
        pulseClass: 'pulse-danger',
        ringOpacity: 0.7,
        label: 'DANGER',
        glow: 'radial-gradient(circle, rgba(196,59,26,0.25) 0%, rgba(196,59,26,0) 70%)',
        glowBlur: '100px',
        labelStyle: 'text-2xl font-bold text-danger',
        innerRingSpin: false,
      };
    case 'HighDangerPossession':
      return {
        color: 'var(--color-high-danger)',
        pulseClass: 'pulse-high-danger',
        ringOpacity: 1.0,
        label: 'DANGER',
        glow: 'radial-gradient(circle, rgba(255,45,45,0.4) 0%, rgba(255,45,45,0) 70%)',
        glowBlur: '140px',
        labelStyle: 'text-3xl font-bold uppercase text-high-danger',
        innerRingSpin: false,
      };
    default:
      return {
        color: 'var(--color-safe)',
        pulseClass: 'pulse-safe',
        ringOpacity: 0.3,
        label: 'SAFE',
        glow: 'none',
        glowBlur: '0px',
        labelStyle: 'text-lg text-safe',
        innerRingSpin: false,
      };
  }
}

export function AlaniDangerMeter({ loading = false }: { loading?: boolean }) {
  const possessionType = usePossessionStore((state) => state.possessionType);
  const possibleEventSoccer = usePossessionStore((state) => state.possibleEventSoccer);
  const { scoresConnected } = useConnectionStore();

  const goalImminent = !!possibleEventSoccer?.Goal;

  const config = useMemo(() => {
    if (loading) {
      return {
        color: 'var(--color-border-subtle)',
        pulseClass: 'opacity-50 animate-shimmer',
        ringOpacity: 0.3,
        label: 'LOADING',
        glow: 'none',
        glowBlur: '0px',
        labelStyle: 'text-lg text-text-muted',
        innerRingSpin: true,
      };
    }
    return getPossessionConfig(possessionType, goalImminent, scoresConnected);
  }, [loading, possessionType, goalImminent, scoresConnected]);

  return (
    <div className="relative w-full h-[40vh] min-h-[200px] flex items-center justify-center overflow-hidden shrink-0">
      {/* Background Glow */}
      <div 
        className="absolute inset-0 transition-all duration-400 ease-in-out pointer-events-none"
        style={{
          background: config.glow,
          filter: `blur(${config.glowBlur})`,
        }}
      />
      
      {/* SVG Circle */}
      <div className={`relative flex items-center justify-center w-64 h-64 ${config.pulseClass} transition-transform duration-400`}>
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full overflow-visible">
          {/* Outer glowing ring */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke={config.color}
            strokeWidth="4"
            opacity={config.ringOpacity}
            className="transition-all duration-400 ease-in-out"
            filter="drop-shadow(0 0 8px currentColor)"
          />
          {/* Inner ring */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={config.color}
            strokeWidth="2"
            opacity={Math.max(0.2, config.ringOpacity - 0.2)}
            className={`transition-all duration-400 ease-in-out ${config.innerRingSpin ? 'spin-slow origin-center' : ''}`}
            strokeDasharray={config.innerRingSpin ? "20 10" : "none"}
          />
        </svg>

        {/* Center Label */}
        <div className="absolute flex flex-col items-center justify-center z-10 transition-all duration-400">
          <span className={`font-display tracking-widest ${config.labelStyle} transition-colors duration-400 drop-shadow-md`}>
            {config.label}
          </span>
          <span className="text-sm text-text-secondary mt-2 font-sans tracking-wide uppercase">
            {goalImminent ? 'PENDING VAR' : (!scoresConnected ? 'RECONNECTING' : 'POSSESSION')}
          </span>
        </div>
      </div>
      
      {/* Screen edge flash for High Danger */}
      {possessionType === 'HighDangerPossession' && !goalImminent && scoresConnected && (
        <div className="fixed inset-0 border-2 border-[var(--color-high-danger)] opacity-50 pointer-events-none animate-pulse z-50" />
      )}
    </div>
  );
}
