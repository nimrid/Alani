import React, { useEffect, useState } from 'react';
import { useScoreStore, useAudioStore } from '@/store/matchStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useConnectionStore } from '@/store/connectionStore';
import { VolumeX, Volume, Volume1, Volume2 } from 'lucide-react';
import { getCrowdAudio } from '@/lib/alani/crowdAudio';

interface AlaniMatchHeaderProps {
  competitionName?: string;
  groupName?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  loading?: boolean;
}

import { AlaniWalletConnect } from './AlaniWalletConnect';
import { useRouter } from 'next/navigation';
import { getFlag } from '@/lib/alani/utils';

export function AlaniMatchHeader({
  competitionName = 'World Cup 2026',
  groupName = 'Group Stage',
  homeTeamName = 'Home',
  awayTeamName = 'Away',
  loading = false
}: AlaniMatchHeaderProps) {
  const { scoreSoccer, statusSoccerId, minutes } = useScoreStore();
  const { scoresConnected } = useConnectionStore();
  const { volume, setVolume } = useAudioStore();
  const router = useRouter();

  // Score flash state
  const { scrubMinute, timelineData } = useTimelineStore();
  
  let homeScore = scoreSoccer?.Participant1?.Total?.Goals ?? 0;
  let awayScore = scoreSoccer?.Participant2?.Total?.Goals ?? 0;
  let displayMinutes = minutes ?? 0;

  // Live minute ticker — increments locally every 60s while match is running
  // so the clock feels alive between 30s snapshot polls
  const [tickedMinute, setTickedMinute] = useState<number | null>(null);

  useEffect(() => {
    // When we receive a new snapshot minute, reset the tick from that base
    setTickedMinute(null);
  }, [minutes]);

  useEffect(() => {
    const statusStr = String(statusSoccerId);
    const running = ['2', '4', '6', '7'].includes(statusStr);
    if (!running || minutes == null) return;
    // Tick every 60 seconds starting from the snapshot minute
    const base = tickedMinute ?? minutes;
    const t = setInterval(() => {
      setTickedMinute(prev => (prev ?? base) + 1);
    }, 60_000);
    return () => clearInterval(t);
  }, [statusSoccerId, minutes]); // eslint-disable-line react-hooks/exhaustive-deps

  const liveMinute = tickedMinute ?? minutes ?? 0;

  if (scrubMinute !== null && timelineData.length > 0) {
    const point = timelineData.find(p => p.minute === scrubMinute) || timelineData[timelineData.length - 1];
    if (point) {
      homeScore = Number(point.homeScore) || 0;
      awayScore = Number(point.awayScore) || 0;
      displayMinutes = scrubMinute;
    }
  } else {
    displayMinutes = liveMinute;
  }
  
  const [prevHome, setPrevHome] = useState(homeScore);
  const [prevAway, setPrevAway] = useState(awayScore);
  const [flashScore, setFlashScore] = useState(false);

  useEffect(() => {
    if (homeScore !== prevHome || awayScore !== prevAway) {
      setFlashScore(true);
      setPrevHome(homeScore);
      setPrevAway(awayScore);
      const t = setTimeout(() => setFlashScore(false), 500);
      return () => clearTimeout(t);
    }
  }, [homeScore, awayScore, prevHome, prevAway]);

  // Connection dot logic
  const [disconnectedSince, setDisconnectedSince] = useState<number | null>(null);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (!scoresConnected) {
      if (!disconnectedSince) setDisconnectedSince(Date.now());
    } else {
      if (disconnectedSince !== null) {
        // Just reconnected
        setJustReconnected(true);
        setTimeout(() => setJustReconnected(false), 2000);
      }
      setDisconnectedSince(null);
    }
  }, [scoresConnected, disconnectedSince]);

  // TxLINE StatusId: 1=pre, 2=1st, 3=HT, 4=2nd, 5=FT, 6=1ET, 7=2ET, 8=ET-HT, 9=Pens
  const isHalfTime = String(statusSoccerId) === '3' || String(statusSoccerId) === '8';
  const isFullTime = String(statusSoccerId) === '5';
  const isRunning = ['2', '4', '6', '7', '9'].includes(String(statusSoccerId));

  const getPhaseText = () => {
    if (scrubMinute !== null) return 'Timeline Scrubbing';
    switch (String(statusSoccerId)) {
      case '1': return 'Pre-Match';
      case '2': return '1st Half';
      case '3': return 'Half Time';
      case '4': return '2nd Half';
      case '5': return 'Full Time';
      case '6': return '1st Extra Time';
      case '7': return '2nd Extra Time';
      case '8': return 'Extra Time HT';
      case '9': return 'Penalties';
      default: return statusSoccerId ? 'Live' : 'Pre-Match';
    }
  };

  const renderConnectionDot = () => {
    if (justReconnected) {
      return <div className="w-2 h-2 rounded-full bg-odds-up mr-2" title="Connected" />;
    }
    if (!scoresConnected) {
      const isRed = disconnectedSince && (Date.now() - disconnectedSince > 15000);
      return (
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full ${isRed ? 'bg-card-red' : 'bg-card-yellow'} animate-pulse mr-2`} />
          <span className="text-[10px] text-text-muted">{isRed ? 'Connection lost' : 'Reconnecting...'}</span>
        </div>
      );
    }
    return null; // Silence when good
  };

  const handleVolumeToggle = () => {
    let nextVolume: 'off' | 'low' | 'medium' | 'high' = 'off';
    if (volume === 'off') nextVolume = 'low';
    else if (volume === 'low') nextVolume = 'medium';
    else if (volume === 'medium') nextVolume = 'high';
    else if (volume === 'high') nextVolume = 'off';
    
    setVolume(nextVolume);
    const audio = getCrowdAudio();
    audio.setVolume(nextVolume);
    if (nextVolume !== 'off') {
      audio.resumeContext();
    }
  };

  const renderVolumeIcon = () => {
    switch (volume) {
      case 'off': return <VolumeX size={20} />;
      case 'low': return <Volume size={20} />;
      case 'medium': return <Volume1 size={20} />;
      case 'high': return <Volume2 size={20} />;
      default: return <Volume1 size={20} />;
    }
  };

  return (
    <>
      {/* Stadium lights flash */}
      <div 
        className={`fixed inset-0 bg-white pointer-events-none z-50 transition-opacity duration-300 ease-out ${flashScore ? 'opacity-15' : 'opacity-0'}`}
      />
      <div className="w-full pt-12 pb-4 flex flex-col items-center justify-center bg-bg-base border-b border-border-subtle shrink-0 relative min-h-[140px]">
        <div
          className="absolute top-4 left-4 z-10 cursor-pointer text-text-muted hover:text-text-primary active:scale-90 transition-all text-sm font-bold tracking-wider uppercase select-none"
          onClick={() => router.push('/')}
        >
          ← Back
        </div>
        <div className="absolute top-4 right-4 z-10 flex items-center gap-4">
          <button onClick={handleVolumeToggle} className="text-text-secondary hover:text-text-primary transition-colors" title={`Crowd Noise: ${volume}`}>
            {renderVolumeIcon()}
          </button>
          {renderConnectionDot()}
          <AlaniWalletConnect />
        </div>

        {/* Competition Label */}
        <div className="text-[10px] md:text-xs uppercase tracking-[0.12em] text-text-muted font-sans mb-3 text-center px-4">
          🏆 {competitionName} · {groupName}
        </div>

        {/* Main Scoreboard Row */}
        <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl px-4 sm:px-6 flex flex-row items-center justify-between">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1">
            <span className="font-display text-lg sm:text-xl md:text-2xl font-bold text-text-primary truncate max-w-20 sm:max-w-28 md:max-w-48 lg:max-w-64 text-center">
              {getFlag(homeTeamName)} {homeTeamName.toUpperCase()}
            </span>
          </div>

          {/* Score Display */}
          <div className={`font-display text-3xl sm:text-4xl md:text-5xl font-bold px-2 sm:px-4 md:px-8 flex items-center justify-center ${isFullTime ? 'text-text-muted' : 'text-text-primary'} ${flashScore ? 'animate-score-flash' : ''}`}>
            {loading ? (
              <span className="text-text-muted">-- <span className="mx-1 sm:mx-2 md:mx-4 font-normal text-2xl sm:text-3xl md:text-4xl">–</span> --</span>
            ) : (
              <>{homeScore} <span className="text-text-muted mx-1 sm:mx-2 md:mx-4 font-normal text-2xl sm:text-3xl md:text-4xl">–</span> {awayScore}</>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1">
            <span className="font-display text-lg sm:text-xl md:text-2xl font-bold text-text-primary truncate max-w-20 sm:max-w-28 md:max-w-48 lg:max-w-64 text-center">
              {getFlag(awayTeamName)} {awayTeamName.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Penalties badge */}
        {String(statusSoccerId) === '9' && (
          <div className="mt-1 text-[11px] font-bold tracking-wider uppercase text-chain-purple text-center">
            Penalty Shootout
          </div>
        )}

        {/* Match Clock & Phase */}
        <div className="mt-3 text-sm text-text-secondary font-sans flex items-center justify-center">
          {isRunning && scrubMinute === null && (
            <>
              <span className="font-mono">{displayMinutes}'</span>
              <span className="mx-2">•</span>
            </>
          )}
          {scrubMinute !== null && (
            <>
              <span className="font-mono text-chain-purple">{displayMinutes}'</span>
              <span className="mx-2 text-chain-purple">•</span>
            </>
          )}
          <span>{getPhaseText()}</span>
          {isRunning && scoresConnected && (
            <div className="w-2 h-2 ml-2 rounded-full bg-high-danger animate-pulse" />
          )}
        </div>
      </div>
    </>
  );
}
