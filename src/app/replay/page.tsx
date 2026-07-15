'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Play, SkipBack, SkipForward, Clock } from 'lucide-react';
import { getFlag } from '@/lib/alani/utils';

import ReactMarkdown from 'react-markdown';

interface ReplayEvent {
  action: string;
  minute: number;
  participant: number | null;
  data: any;
  ts: number;
}

const ACTION_ICON: Record<string, string> = {
  goal: '⚽', yellow_card: '🟨', red_card: '🟥', var: '📺',
  var_end: '✅', substitution: '🔄', penalty: '🎯', corner: '⚑',
  shot: '🥅', kickoff: '▶', halftime_finalised: '⏸', status: '📍',
};

export default function ReplayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fixtureId = searchParams.get('fixtureId');

  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchInfo, setMatchInfo] = useState<{
    home: string; away: string; homeGoals: number; awayGoals: number;
    competition: string; statusId: string;
  } | null>(null);
  const [playheadIdx, setPlayheadIdx] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);

  const startAnalysis = async () => {
    if (analysisText) {
      setShowAnalysis(true);
      return;
    }
    
    setIsAnalyzing(true);
    setShowAnalysis(true);
    setAnalysisText('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchInfo, events })
      });

      if (!res.ok) throw new Error('Analysis failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnalysisText(prev => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      console.error(err);
      setAnalysisText('Failed to generate analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!fixtureId) { setLoading(false); return; }

    fetch(`/api/txline/scores-snapshot?fixtureId=${fixtureId}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (!Array.isArray(data) || data.length === 0) { setLoading(false); return; }

        const sorted = [...data].sort((a, b) => (a.Ts || 0) - (b.Ts || 0));

        // Get Lineups for Player names
        const lineupItem = data.find((d: any) => d.Action === 'lineups' && d.Lineups);
        const playerNames: Record<number, string> = {};
        if (lineupItem) {
          for (const team of lineupItem.Lineups) {
            for (const p of (team.lineups || [])) {
              if (p.player?.preferredName) {
                if (p.fixturePlayerId) playerNames[p.fixturePlayerId] = p.player.preferredName;
                if (p.player.normativeId) playerNames[Number(p.player.normativeId)] = p.player.preferredName;
              }
            }
          }
        }

        // Extract match info from best Score object
        const withScore = [...sorted].filter(d => d.Score).sort((a, b) => (b.Ts || 0) - (a.Ts || 0));
        const bestScore = withScore[0]?.Score;
        const latestStats = [...sorted].filter(d => d.Stats).sort((a, b) => (b.Ts || 0) - (a.Ts || 0))[0];

        setMatchInfo({
          home: lineupItem?.Lineups?.[0]?.preferredName || 'Home',
          away: lineupItem?.Lineups?.[1]?.preferredName || 'Away',
          homeGoals: bestScore?.Participant1?.Total?.Goals ?? 0,
          awayGoals: bestScore?.Participant2?.Total?.Goals ?? 0,
          competition: latestStats?.Competition || 'Match Replay',
          statusId: String(latestStats?.StatusId ?? '5'),
        });

        // Build timeline of significant events
        const significantActions = new Set([
          'goal', 'yellow_card', 'red_card', 'var', 'var_end',
          'substitution', 'penalty', 'penalty_outcome', 'kickoff', 'halftime_finalised',
          'status', 'corner', 'shot', 'injury', 'foul', 'offside'
        ]);

        const replayEvs: ReplayEvent[] = sorted
          .filter(d => d.Action && significantActions.has(d.Action.toLowerCase()))
          .map(d => {
            const pid = d.Data?.PlayerId || d.Data?.PlayerInId;
            return {
              action: d.Action.toLowerCase(),
              minute: d.Clock?.Seconds != null ? Math.floor(d.Clock.Seconds / 60) : 0,
              participant: d.Participant ?? null,
              data: { ...d.Data, playerName: pid ? playerNames[pid] : undefined },
              ts: d.Ts || 0,
            };
          });

        setEvents(replayEvs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [fixtureId]);

  // Auto-play: advance playhead every 800ms
  useEffect(() => {
    if (!isPlaying || events.length === 0) return;
    const t = setInterval(() => {
      setPlayheadIdx(prev => {
        const next = (prev ?? -1) + 1;
        if (next >= events.length) { setIsPlaying(false); return events.length - 1; }
        return next;
      });
    }, 800);
    return () => clearInterval(t);
  }, [isPlaying, events.length]);

  const displayedEvents = playheadIdx !== null ? events.slice(0, playheadIdx + 1) : events;

  if (!fixtureId) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-4 text-center p-6">
        <span className="text-4xl">📺</span>
        <h1 className="font-display font-black text-2xl">Match Replay</h1>
        <p className="text-text-muted text-sm max-w-xs">
          Open a completed match from the homepage to watch its event replay here.
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 text-chain-purple font-bold text-sm hover:underline"
        >
          ← Browse Matches
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col text-text-primary">
      {/* Header */}
      <header className="h-16 flex items-center px-4 border-b border-border-subtle bg-bg-surface sticky top-0 z-10 gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-bg-elevated rounded-full transition-all active:scale-90"
        >
          <ArrowLeft size={20} className="text-text-secondary" />
        </button>
        <div className="flex-1">
          <div className="text-[10px] text-text-muted uppercase tracking-widest">
            {matchInfo?.competition || 'Replay'}
          </div>
          {matchInfo && (
            <div className="font-display font-bold text-sm">
              {getFlag(matchInfo.home)} {matchInfo.home} {matchInfo.homeGoals}–{matchInfo.awayGoals} {matchInfo.away} {getFlag(matchInfo.away)}
            </div>
          )}
        </div>
        <span className="text-xs text-chain-purple font-bold uppercase tracking-widest border border-chain-purple/40 rounded px-2 py-0.5">
          FT
        </span>
      </header>

      <div className="max-w-lg mx-auto w-full px-4 pt-6">
        <button
          onClick={startAnalysis}
          disabled={isAnalyzing}
          className="relative w-full overflow-hidden flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold transition-all duration-300 bg-gradient-to-r from-chain-purple to-[#4F46E5] text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-[0_0_20px_rgba(124,58,237,0.3)]"
        >
          {isAnalyzing && (
            <div className="absolute inset-0 bg-white/10 animate-pulse" />
          )}
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10" />
              <span className="relative z-10">Generating Analysis...</span>
            </>
          ) : showAnalysis ? (
            '✨ Regenerate Technical Analysis'
          ) : (
            '✨ Alani Technical Analysis'
          )}
        </button>

        {showAnalysis && (
          <div className="relative mt-6 p-6 bg-bg-surface/80 backdrop-blur-md border border-chain-purple/20 rounded-2xl animate-fade-in text-sm leading-relaxed shadow-xl shadow-chain-purple/5">
            <div className="absolute -top-3 left-6 px-3 py-0.5 bg-bg-elevated border border-chain-purple/30 rounded-full text-[10px] font-bold text-chain-purple tracking-widest uppercase shadow-sm">
              Alani Insights
            </div>
            
            {analysisText ? (
              <div className="prose prose-invert prose-p:text-text-secondary prose-headings:text-text-primary prose-a:text-chain-purple max-w-none pt-2">
                <ReactMarkdown>{analysisText}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                <div className="relative w-12 h-12 mb-4 flex items-center justify-center">
                  <div className="absolute inset-0 border-2 border-chain-purple/20 rounded-full" />
                  <div className="absolute inset-0 border-2 border-chain-purple border-t-transparent rounded-full animate-spin" />
                  <span className="text-xl animate-pulse">🤖</span>
                </div>
                <p className="font-medium bg-gradient-to-r from-text-primary to-text-muted bg-clip-text text-transparent animate-pulse">
                  Alani is reviewing the match footage...
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <main className="flex-1 overflow-y-auto p-4 pb-32 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="flex flex-col gap-3 mt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-bg-surface rounded-xl animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <span className="text-4xl">📋</span>
            <p className="text-text-primary font-display font-bold">No replay data</p>
            <p className="text-text-muted text-sm">This match has no recorded event timeline.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[22px] top-0 bottom-0 w-px bg-border-subtle" />

            <div className="flex flex-col gap-1">
              {displayedEvents.map((ev, i) => {
                const icon = ACTION_ICON[ev.action] || '⚡';
                const isGoal = ev.action === 'goal';
                const isCard = ev.action === 'yellow_card' || ev.action === 'red_card';
                const isKeyEvent = isGoal || isCard || ev.action === 'penalty' || ev.action === 'var_end';

                return (
                  <div
                    key={`${ev.ts}-${i}`}
                    className={`flex items-start gap-3 py-2 transition-all duration-300 ${
                      i === playheadIdx ? 'opacity-100' : 'opacity-70'
                    }`}
                  >
                    {/* Icon dot */}
                    <div className={`relative z-10 flex items-center justify-center w-11 h-11 rounded-full shrink-0 text-lg ${
                      isGoal ? 'bg-[var(--color-goal)]/20 border border-[var(--color-goal)]/50' :
                      isCard ? 'bg-bg-elevated border border-border-subtle' :
                      'bg-bg-base border border-border-subtle'
                    }`}>
                      {icon}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 flex items-center justify-between py-2 px-3 rounded-xl ${
                      isKeyEvent ? 'bg-bg-surface border border-border-subtle' : ''
                    }`}>
                      <div>
                        <span className={`text-sm font-bold ${isGoal ? 'text-[var(--color-goal)]' : 'text-text-primary'}`}>
                          {ev.action.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        {(ev.data?.playerName || ev.data?.PlayerId) && (
                          <span className="text-xs text-text-muted ml-2">
                            {ev.data.playerName ? ev.data.playerName : `#${ev.data.PlayerId}`}
                          </span>
                        )}
                      </div>
                      {ev.minute > 0 && (
                        <span className="text-xs font-mono text-text-muted shrink-0">{ev.minute}'</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Playback Controls */}
      {events.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-bg-surface/95 backdrop-blur border-t border-border-subtle p-4 z-20">
          <div className="max-w-lg mx-auto flex flex-col gap-3">
            {/* Progress bar */}
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Clock size={12} />
              <div className="flex-1 h-1 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-chain-purple transition-all duration-300"
                  style={{ width: `${playheadIdx !== null ? ((playheadIdx + 1) / events.length) * 100 : 100}%` }}
                />
              </div>
              <span>{playheadIdx !== null ? playheadIdx + 1 : events.length} / {events.length}</span>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => { setIsPlaying(false); setPlayheadIdx(0); }}
                className="p-2 text-text-secondary hover:text-text-primary active:scale-90 transition-all"
              >
                <SkipBack size={20} />
              </button>

              <button
                onClick={() => {
                  if (playheadIdx === null || playheadIdx >= events.length - 1) {
                    setPlayheadIdx(0);
                  }
                  setIsPlaying(p => !p);
                }}
                className="w-14 h-14 rounded-full bg-chain-purple text-white flex items-center justify-center hover:bg-chain-purple/80 active:scale-90 transition-all shadow-lg"
                style={{ boxShadow: '0 0 20px rgba(153, 69, 255, 0.4)' }}
              >
                {isPlaying ? (
                  <span className="text-xl font-bold">⏸</span>
                ) : (
                  <Play size={22} fill="white" />
                )}
              </button>

              <button
                onClick={() => { setIsPlaying(false); setPlayheadIdx(events.length - 1); }}
                className="p-2 text-text-secondary hover:text-text-primary active:scale-90 transition-all"
              >
                <SkipForward size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
