import React, { useEffect, useState } from 'react';
import { useOddsStore } from '@/store/oddsStore';
import { useTimelineStore } from '@/store/timelineStore';
import { getFlag } from '@/lib/alani/utils';

interface AlaniProbabilityBarProps {
  homeTeamName: string;
  awayTeamName: string;
}

export function AlaniProbabilityBar({ homeTeamName, awayTeamName }: AlaniProbabilityBarProps) {
  const currentOdds = useOddsStore((state) => state.currentOdds);
  const history = useOddsStore((state) => state.history);
  const { scrubMinute, timelineData } = useTimelineStore();

  let homeWinPct = currentOdds?.homeWin || 50;
  let awayWinPct = currentOdds?.awayWin || 50;

  if (scrubMinute !== null && timelineData.length > 0) {
    const point = timelineData.find(p => p.minute === scrubMinute) || timelineData[timelineData.length - 1];
    if (point) {
      homeWinPct = point.homeWin ?? homeWinPct;
      awayWinPct = point.awayWin ?? awayWinPct;
    }
  }

  const [prevHomeWinPct, setPrevHomeWinPct] = useState(homeWinPct);
  const [prevAwayWinPct, setPrevAwayWinPct] = useState(awayWinPct);
  
  const [homeShift, setHomeShift] = useState<{ active: boolean, dir: 'up' | 'down' }>({ active: false, dir: 'up' });
  const [awayShift, setAwayShift] = useState<{ active: boolean, dir: 'up' | 'down' }>({ active: false, dir: 'up' });

  useEffect(() => {
    const homeDiff = homeWinPct - prevHomeWinPct;
    if (Math.abs(homeDiff) > 5) {
      setHomeShift({ active: true, dir: homeDiff > 0 ? 'up' : 'down' });
      const t = setTimeout(() => setHomeShift(prev => ({ ...prev, active: false })), 2000);
      return () => clearTimeout(t);
    }
    setPrevHomeWinPct(homeWinPct);
  }, [homeWinPct, prevHomeWinPct]);

  useEffect(() => {
    const awayDiff = awayWinPct - prevAwayWinPct;
    if (Math.abs(awayDiff) > 5) {
      setAwayShift({ active: true, dir: awayDiff > 0 ? 'up' : 'down' });
      const t = setTimeout(() => setAwayShift(prev => ({ ...prev, active: false })), 2000);
      return () => clearTimeout(t);
    }
    setPrevAwayWinPct(awayWinPct);
  }, [awayWinPct, prevAwayWinPct]);

  // Calculate delta since kickoff (first data point in history)
  let homeDelta = 0;
  let awayDelta = 0;
  if (history.length > 0) {
    const startOdds = history[0];
    homeDelta = homeWinPct - startOdds.homeWin;
    awayDelta = awayWinPct - startOdds.awayWin;
  }

  return (
    <div className="w-full bg-bg-surface px-6 py-4 border-t border-border-subtle shrink-0 shadow-lg z-30">
      {/* Team Names Row */}
      <div className="flex justify-between items-end mb-2">
        <div className="flex flex-col items-start relative">
          <span className="font-display text-sm font-bold tracking-widest uppercase text-text-primary">
            {getFlag(homeTeamName)} {homeTeamName}
          </span>
          <div className="flex items-center mt-1">
            <span className="font-display text-2xl font-bold" style={{ color: 'var(--color-odds-up)' }}>
              {homeWinPct.toFixed(1)}%
            </span>
            <span className={`ml-2 text-odds-up text-lg font-bold transition-opacity duration-300 ${homeShift.active ? 'opacity-100' : 'opacity-0'}`}>
              {homeShift.dir === 'up' ? '↑' : '↓'}
            </span>
          </div>
        </div>

        <span className="text-xs text-text-muted font-sans uppercase tracking-[0.2em] mb-2">
          Win Odds
        </span>

        <div className="flex flex-col items-end relative">
          <span className="font-display text-sm font-bold tracking-widest uppercase text-text-primary">
            {getFlag(awayTeamName)} {awayTeamName}
          </span>
          <div className="flex items-center mt-1">
            <span className={`mr-2 text-odds-down text-lg font-bold transition-opacity duration-300 ${awayShift.active ? 'opacity-100' : 'opacity-0'}`}>
              {awayShift.dir === 'up' ? '↑' : '↓'}
            </span>
            <span className="font-display text-2xl font-bold" style={{ color: 'var(--color-odds-down)' }}>
              {awayWinPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="relative w-full h-3 rounded-full bg-bg-elevated overflow-hidden border border-border-subtle flex">
        {/* Home Fill */}
        <div 
          className="h-full transition-all duration-600 ease-in-out relative"
          style={{ 
            width: `${homeWinPct}%`,
            background: 'linear-gradient(90deg, rgba(34,197,94,0.4) 0%, rgba(34,197,94,1) 100%)'
          }}
        />
        {/* Divider */}
        <div className="w-1 h-full bg-bg-base z-10 -ml-[2px]" />
        {/* Away Fill */}
        <div 
          className="h-full transition-all duration-600 ease-in-out flex-1"
          style={{ 
            background: 'linear-gradient(90deg, rgba(239,68,68,1) 0%, rgba(239,68,68,0.4) 100%)'
          }}
        />
      </div>

      {/* Deltas */}
      <div className="flex justify-between items-center mt-3 text-xs font-mono">
        <span className={homeDelta >= 0 ? 'text-odds-up' : 'text-odds-down'}>
          {homeDelta >= 0 ? '↑' : '↓'} {Math.abs(homeDelta).toFixed(1)}% since kickoff
        </span>
        <span className={awayDelta >= 0 ? 'text-odds-down' : 'text-odds-up'}>
          {Math.abs(awayDelta).toFixed(1)}% since kickoff {awayDelta >= 0 ? '↑' : '↓'}
        </span>
      </div>
    </div>
  );
}
