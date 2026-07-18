'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Clock, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { getFlag } from '@/lib/alani/utils';
import ReactMarkdown from 'react-markdown';
import { AskTheAnalyst } from '@/components/alani/AskTheAnalyst';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReplayEvent {
  action: string;
  minute: number;
  period: 'H1' | 'H2' | 'ET' | 'unknown';
  participant: number | null; // 1 = home, 2 = away
  data: any;
  ts: number;
  scoreAtEvent: { home: number; away: number } | null;
}

interface MatchInfo {
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  competition: string;
  fixtureId: string;
  participant1Id: number | null;
  participant2Id: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_ICON: Record<string, string> = {
  goal: '⚽',
  yellow_card: '🟨',
  red_card: '🟥',
  var: '📺',
  var_end: '✅',
  substitution: '🔄',
  penalty: '🎯',
  corner: '⚑',
  shot: '🥅',
  kickoff: '▶',
  halftime_finalised: '⏸',
  free_kick: '🎯',
  additional_time: '⏱',
};

const ACTION_LABEL: Record<string, string> = {
  goal: 'GOAL',
  yellow_card: 'YELLOW CARD',
  red_card: 'RED CARD',
  var: 'VAR REVIEW',
  var_end: 'VAR DECISION',
  substitution: 'SUBSTITUTION',
  penalty: 'PENALTY',
  corner: 'CORNER',
  shot: 'SHOT',
  kickoff: 'KICK OFF',
  halftime_finalised: 'HALF TIME',
  free_kick: 'FREE KICK',
  additional_time: 'ADDITIONAL TIME',
};

// Actions to include in the timeline (exclude internal/noisy ones)
const TIMELINE_ACTIONS = new Set([
  'goal', 'yellow_card', 'red_card', 'var', 'var_end',
  'substitution', 'penalty', 'penalty_outcome', 'kickoff',
  'halftime_finalised', 'corner', 'shot', 'free_kick', 'additional_time',
]);

// Key events get a highlighted card treatment
const KEY_EVENTS = new Set(['goal', 'red_card', 'penalty', 'var_end']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMinute(seconds: number): number {
  return Math.floor(seconds / 60);
}

function getPeriod(seconds: number): 'H1' | 'H2' | 'ET' {
  // H1: up to 45' plus generous added time buffer (~55')
  if (seconds <= 3300) return 'H1';
  // H2: up to 90' plus generous added time buffer (~105')
  if (seconds <= 6300) return 'H2';
  // Only genuine extra time beyond 105+
  return 'ET';
}

// (Player name resolution via PlayerStats was removed — the normativeIds in the snapshot
// don't reliably match event Data.PlayerId fields, so we rely on team attribution instead.)

// ─── Sub-components ───────────────────────────────────────────────────────────

function HalfSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border-subtle" />
      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-2 py-0.5 border border-border-subtle rounded-full bg-bg-elevated">
        {label}
      </span>
      <div className="flex-1 h-px bg-border-subtle" />
    </div>
  );
}

function EventRow({ ev, isActive, teamName }: { ev: ReplayEvent; isActive: boolean; teamName: string | null }) {
  const icon = ACTION_ICON[ev.action] ?? '⚡';
  const label = ACTION_LABEL[ev.action] ?? ev.action.replace(/_/g, ' ').toUpperCase();
  const isKey = KEY_EVENTS.has(ev.action);
  const isGoal = ev.action === 'goal';
  const isCard = ev.action === 'yellow_card' || ev.action === 'red_card';

  // Build sub-detail string
  let detail = '';
  if (ev.action === 'shot') detail = ev.data?.Outcome === 'OnTarget' ? 'On target' : ev.data?.Outcome === 'OffTarget' ? 'Off target' : ev.data?.Outcome || '';
  if (ev.action === 'var_end') detail = ev.data?.Outcome || '';
  if (ev.action === 'goal') detail = ev.data?.GoalType || '';
  if (ev.action === 'additional_time') detail = ev.data?.Minutes ? `+${ev.data.Minutes}'` : '';
  if (ev.action === 'substitution') {
    const inId = ev.data?.PlayerInId;
    const outId = ev.data?.PlayerOutId;
    if (inId && outId) detail = `#${inId} ↗ #${outId}`;
  }

  return (
    <div className={`flex items-center gap-3 py-1.5 transition-all duration-200 ${isActive ? 'opacity-100 scale-[1.01]' : 'opacity-75'}`}>
      {/* Icon */}
      <div className={`relative z-10 w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-base
        ${isGoal ? 'bg-emerald-500/15 border border-emerald-500/40 shadow-sm shadow-emerald-500/20' :
          isCard ? 'bg-bg-elevated border border-border-subtle' :
          'bg-bg-base border border-border-subtle'}`}>
        {icon}
      </div>

      {/* Content */}
      <div className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl min-w-0
        ${isKey ? 'bg-bg-surface border border-border-subtle' : ''}`}>
        <div className="min-w-0">
          <div className={`text-xs font-bold tracking-wide ${isGoal ? 'text-emerald-400' : isCard ? 'text-yellow-400' : 'text-text-primary'}`}>
            {label}
            {teamName && <span className="font-normal text-text-muted ml-1.5">· {teamName}</span>}
          </div>
          {detail && (
            <div className="text-[10px] text-text-muted mt-0.5 truncate">{detail}</div>
          )}
          {isGoal && ev.scoreAtEvent && (
            <div className="text-[10px] font-mono font-bold text-emerald-400 mt-0.5">
              {ev.scoreAtEvent.home} – {ev.scoreAtEvent.away}
            </div>
          )}
        </div>
        {ev.minute > 0 && (
          <span className="text-[10px] font-mono text-text-muted shrink-0 ml-3">{ev.minute}'</span>
        )}
      </div>
    </div>
  );
}

function GoalDots({ events, homeTeam, awayTeam }: { events: ReplayEvent[]; homeTeam: string; awayTeam: string }) {
  const goals = events.filter(e => e.action === 'goal');
  if (!goals.length) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-text-muted">
      <div className="flex items-center gap-1">
        {goals.filter(g => g.participant === 1).map((g, i) => (
          <span key={i} title={`${g.minute}'`} className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
        ))}
      </div>
      <div className="flex items-center gap-1">
        {goals.filter(g => g.participant === 2).map((g, i) => (
          <span key={i} title={`${g.minute}'`} className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Tab = 'timeline' | 'analysis' | 'ask';

function ReplayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fixtureId = searchParams.get('fixtureId');

  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);

  const [playheadIdx, setPlayheadIdx] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 2 | 5>(1);

  // Tab
  const [activeTab, setActiveTab] = useState<Tab>('timeline');

  // Analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [analysisDone, setAnalysisDone] = useState(false);

  // ── Data Loading ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fixtureId) { setLoading(false); return; }

    Promise.all([
      fetch(`/api/txline/scores-snapshot?fixtureId=${fixtureId}`).then(r => r.ok ? r.json() : []),
      fetch('/api/txline/fixtures').then(r => r.ok ? r.json() : []),
    ]).then(([snapshotData, fixturesData]: [any[], any[]]) => {
      if (!Array.isArray(snapshotData) || snapshotData.length === 0) { setLoading(false); return; }

      const sorted = [...snapshotData].sort((a, b) => (a.Ts || 0) - (b.Ts || 0));

      // Resolve team names from fixtures list
      const fixEntry = Array.isArray(fixturesData)
        ? fixturesData.find((f: any) => String(f.FixtureId) === String(fixtureId))
        : null;
      const homeName = fixEntry?.Participant1 || 'Home';
      const awayName = fixEntry?.Participant2 || 'Away';
      const competitionName = fixEntry?.Competition || 'Match Replay';

      // Extract final score from the last score event
      const withScore = [...sorted].filter(d => d.Score).sort((a, b) => (b.Ts || 0) - (a.Ts || 0));
      const bestScore = withScore[0]?.Score;

      // Get participant IDs from data
      const p1Id = sorted[0]?.Participant1Id ?? null;
      const p2Id = sorted[0]?.Participant2Id ?? null;

      setMatchInfo({
        home: homeName,
        away: awayName,
        homeGoals: bestScore?.Participant1?.Total?.Goals ?? 0,
        awayGoals: bestScore?.Participant2?.Total?.Goals ?? 0,
        competition: competitionName,
        fixtureId: fixtureId!,
        participant1Id: p1Id,
        participant2Id: p2Id,
      });

      // Build timeline events with running score
      const replayEvs: ReplayEvent[] = [];
      let runningHome = 0;
      let runningAway = 0;

      for (const d of sorted) {
        const action = (d.Action || '').toLowerCase();
        if (!TIMELINE_ACTIONS.has(action)) continue;

        const clockSecs = d.Clock?.Seconds ?? 0;
        const minute = formatMinute(clockSecs);
        const period = getPeriod(clockSecs);

        // Update running score from this event's Score object
        if (d.Score) {
          runningHome = d.Score.Participant1?.Total?.Goals ?? runningHome;
          runningAway = d.Score.Participant2?.Total?.Goals ?? runningAway;
        }

        replayEvs.push({
          action,
          minute,
          period,
          participant: d.Participant ?? d.Data?.Participant ?? null,
          data: d.Data ?? {},
          ts: d.Ts || 0,
          scoreAtEvent: action === 'goal' ? { home: runningHome, away: runningAway } : null,
        });
      }

      setEvents(replayEvs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [fixtureId]);

  // ── Auto-play ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || events.length === 0) return;
    const tickMs = Math.round(700 / playSpeed);
    const t = setInterval(() => {
      setPlayheadIdx(prev => {
        const next = (prev ?? -1) + 1;
        if (next >= events.length) { setIsPlaying(false); return events.length - 1; }
        return next;
      });
    }, tickMs);
    return () => clearInterval(t);
  }, [isPlaying, events.length, playSpeed]);

  // ── Analysis ────────────────────────────────────────────────────────────────
  const startAnalysis = async () => {
    if (analysisDone) return; // already done
    setIsAnalyzing(true);
    setAnalysisText('');
    setActiveTab('analysis');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchInfo, events }),
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
      setAnalysisDone(true);
    } catch (err) {
      console.error(err);
      setAnalysisText('Failed to generate analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const displayedEvents = playheadIdx !== null ? events.slice(0, playheadIdx + 1) : events;
  const h1Events = displayedEvents.filter(e => e.period === 'H1');
  const h2Events = displayedEvents.filter(e => e.period === 'H2');
  const etEvents = displayedEvents.filter(e => e.period === 'ET');

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!fixtureId) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-4 text-center p-6">
        <span className="text-5xl">📺</span>
        <h1 className="font-display font-black text-2xl">Match Replay</h1>
        <p className="text-text-muted text-sm max-w-xs">
          Open a completed match from the homepage to watch its event replay here.
        </p>
        <button onClick={() => router.push('/')} className="mt-4 text-chain-purple font-bold text-sm hover:underline">
          ← Browse Matches
        </button>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-base flex flex-col text-text-primary">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-20 h-14 flex items-center px-4 border-b border-border-subtle bg-bg-surface/95 backdrop-blur gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-bg-elevated rounded-full transition-all active:scale-90">
          <ArrowLeft size={18} className="text-text-secondary" />
        </button>
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="h-3 w-32 bg-bg-elevated animate-pulse rounded" />
          ) : (
            <div className="text-[11px] text-text-muted uppercase tracking-widest truncate">{matchInfo?.competition}</div>
          )}
        </div>
        <span className="text-[10px] text-chain-purple font-bold uppercase tracking-widest border border-chain-purple/40 rounded-full px-2.5 py-0.5 shrink-0">
          FT
        </span>
      </header>

      {/* ── Hero score card ── */}
      <div className="max-w-lg mx-auto w-full px-4 pt-6 pb-4">
        {loading ? (
          <div className="h-28 bg-bg-surface rounded-2xl animate-pulse" />
        ) : matchInfo ? (
          <div className="bg-bg-surface border border-border-subtle rounded-2xl px-6 py-5 text-center shadow-sm">
            <div className="flex items-center justify-center gap-4">
              {/* Home */}
              <div className="flex-1 text-right">
                <div className="text-2xl mb-1">{getFlag(matchInfo.home)}</div>
                <div className="font-display font-bold text-sm text-text-primary leading-tight">{matchInfo.home}</div>
              </div>

              {/* Score */}
              <div className="px-4 text-center">
                <div className="font-display font-black text-4xl tracking-tight text-text-primary">
                  {matchInfo.homeGoals}<span className="text-text-muted mx-1">–</span>{matchInfo.awayGoals}
                </div>
                <div className="text-[10px] text-chain-purple font-bold uppercase tracking-widest mt-1">Full Time</div>
              </div>

              {/* Away */}
              <div className="flex-1 text-left">
                <div className="text-2xl mb-1">{getFlag(matchInfo.away)}</div>
                <div className="font-display font-bold text-sm text-text-primary leading-tight">{matchInfo.away}</div>
              </div>
            </div>

            {/* Goal dots */}
            {events.length > 0 && <GoalDots events={events} homeTeam={matchInfo.home} awayTeam={matchInfo.away} />}
          </div>
        ) : null}
      </div>

      {/* ── Tab bar ── */}
      <div className="max-w-lg mx-auto w-full px-4 mb-4">
        <div className="flex bg-bg-surface border border-border-subtle rounded-xl p-1 gap-1">
          {(['timeline', 'analysis'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => {
            if (tab === 'analysis' && !analysisDone && !isAnalyzing) {
              startAnalysis();
            } else {
              setActiveTab(tab);
            }
          }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize ${
                activeTab === tab
                  ? 'bg-chain-purple text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {tab === 'analysis' ? '✨ Analysis' : '📋 Timeline'}
            </button>
          ))}
          {analysisDone && (
            <button
              onClick={() => setActiveTab('ask')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ask'
                  ? 'bg-chain-purple text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              🤖 Ask Alani
            </button>
          )}
        </div>
      </div>

      {/* ── Content area ── */}
      <main className="flex-1 overflow-y-auto pb-36 max-w-lg mx-auto w-full px-4">

        {/* ─── Timeline Tab ─── */}
        {activeTab === 'timeline' && (
          <>
            {loading ? (
              <div className="flex flex-col gap-3">
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
                {/* Vertical line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-border-subtle pointer-events-none" />

                {h1Events.length > 0 && (
                  <>
                    <HalfSeparator label="First Half" />
                    {h1Events.map((ev, i) => (
                      <EventRow
                        key={`h1-${ev.ts}-${i}`}
                        ev={ev}
                        isActive={playheadIdx === null || events.indexOf(ev) <= (playheadIdx ?? Infinity)}
                        teamName={ev.participant === 1 ? matchInfo?.home ?? null : ev.participant === 2 ? matchInfo?.away ?? null : null}
                      />
                    ))}
                  </>
                )}

                {h2Events.length > 0 && (
                  <>
                    <HalfSeparator label="Second Half" />
                    {h2Events.map((ev, i) => (
                      <EventRow
                        key={`h2-${ev.ts}-${i}`}
                        ev={ev}
                        isActive={playheadIdx === null || events.indexOf(ev) <= (playheadIdx ?? Infinity)}
                        teamName={ev.participant === 1 ? matchInfo?.home ?? null : ev.participant === 2 ? matchInfo?.away ?? null : null}
                      />
                    ))}
                  </>
                )}

                {etEvents.length > 0 && (
                  <>
                    <HalfSeparator label="Extra Time" />
                    {etEvents.map((ev, i) => (
                      <EventRow
                        key={`et-${ev.ts}-${i}`}
                        ev={ev}
                        isActive={playheadIdx === null || events.indexOf(ev) <= (playheadIdx ?? Infinity)}
                        teamName={ev.participant === 1 ? matchInfo?.home ?? null : ev.participant === 2 ? matchInfo?.away ?? null : null}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ─── Analysis Tab ─── */}
        {activeTab === 'analysis' && (
          <div className="relative p-6 bg-bg-surface border border-chain-purple/20 rounded-2xl shadow-xl shadow-chain-purple/5">
            <div className="absolute -top-3 left-6 px-3 py-0.5 bg-bg-elevated border border-chain-purple/30 rounded-full text-[10px] font-bold text-chain-purple tracking-widest uppercase shadow-sm">
              Alani Insights
            </div>

            {isAnalyzing && !analysisText ? (
              <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                <div className="relative w-14 h-14 mb-5 flex items-center justify-center">
                  <div className="absolute inset-0 border-2 border-chain-purple/20 rounded-full" />
                  <div className="absolute inset-0 border-2 border-chain-purple border-t-transparent rounded-full animate-spin" />
                  <span className="text-2xl animate-pulse">🤖</span>
                </div>
                <p className="font-medium animate-pulse">Alani is reviewing the match footage...</p>
              </div>
            ) : (
              <div className="prose prose-invert prose-sm prose-p:text-text-secondary prose-headings:text-text-primary prose-strong:text-text-primary prose-a:text-chain-purple max-w-none pt-2">
                <ReactMarkdown>{analysisText || '_Generating analysis…_'}</ReactMarkdown>
              </div>
            )}

            {analysisDone && (
              <button
                onClick={() => { setAnalysisText(''); setAnalysisDone(false); startAnalysis(); }}
                className="mt-5 text-xs text-chain-purple hover:underline font-semibold"
              >
                ↺ Regenerate
              </button>
            )}
          </div>
        )}

        {/* ─── Ask Alani Tab ─── */}
        {activeTab === 'ask' && analysisDone && matchInfo && (
          <AskTheAnalyst matchInfo={matchInfo} events={events} playheadIdx={playheadIdx} />
        )}
      </main>

      {/* ── Playback controls ── */}
      {events.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-20 bg-bg-surface/95 backdrop-blur border-t border-border-subtle">
          <div className="max-w-lg mx-auto px-4 py-3 flex flex-col gap-2">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <Clock size={11} className="text-text-muted shrink-0" />
              <div
                className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  setPlayheadIdx(Math.min(events.length - 1, Math.floor(ratio * events.length)));
                  setIsPlaying(false);
                }}
              >
                <div
                  className="h-full bg-chain-purple transition-all duration-200"
                  style={{ width: `${playheadIdx !== null ? ((playheadIdx + 1) / events.length) * 100 : 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-text-muted shrink-0">
                {playheadIdx !== null ? playheadIdx + 1 : events.length}/{events.length}
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => { setIsPlaying(false); setPlayheadIdx(0); }}
                className="p-2 text-text-secondary hover:text-text-primary active:scale-90 transition-all"
              >
                <SkipBack size={18} />
              </button>

              <button
                onClick={() => {
                  if (playheadIdx === null || playheadIdx >= events.length - 1) setPlayheadIdx(0);
                  setIsPlaying(p => !p);
                }}
                className="w-12 h-12 rounded-full bg-chain-purple text-white flex items-center justify-center hover:opacity-90 active:scale-90 transition-all shadow-lg shadow-chain-purple/40"
              >
                {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
              </button>

              <button
                onClick={() => { setIsPlaying(false); setPlayheadIdx(events.length - 1); }}
                className="p-2 text-text-secondary hover:text-text-primary active:scale-90 transition-all"
              >
                <SkipForward size={18} />
              </button>

              {/* Speed control */}
              <button
                onClick={() => setPlaySpeed(s => s === 1 ? 2 : s === 2 ? 5 : 1)}
                className="text-xs font-black tabular-nums text-chain-purple bg-chain-purple/10 border border-chain-purple/30 rounded-lg px-2 py-1 hover:bg-chain-purple/20 transition-colors min-w-[36px] text-center"
                title="Playback speed"
              >
                {playSpeed}×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReplayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <div className="w-8 h-8 border-2 border-chain-purple border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading replay…</span>
        </div>
      </div>
    }>
      <ReplayContent />
    </Suspense>
  );
}
