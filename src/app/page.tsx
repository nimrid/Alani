'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings, Map as MapIcon } from 'lucide-react';
import { computeDramaIndex, MatchDramaState } from '@/lib/alani/dramaIndex';
import { AlaniWalletConnect } from '@/components/alani/AlaniWalletConnect';
import { SkeletonMatchCard } from '@/components/alani/AlaniSkeleton';
import { getFlag, getGroupName } from '@/lib/alani/utils';
import { KickoffReminder } from '@/components/alani/KickoffReminder';

interface Fixture {
  Ts: number;
  StartTime: number;
  Competition: string;
  CompetitionId: number;
  FixtureGroupId: number;
  Participant1Id: number;
  Participant1: string;
  Participant2Id: number;
  Participant2: string;
  FixtureId: number;
  Participant1IsHome: boolean;
  GameState?: number;
}

interface LiveMatchData {
  fixture: Fixture;
  oddsSnapshot?: any;
  dramaIndex: number;
  homeGoals: number;
  awayGoals: number;
  minute: number;
  statusId: string;
  homeWinPct: number;
  awayWinPct: number;
}

// StatusId → human label for card badges
const STATUS_LABEL: Record<string, string> = {
  '1': 'Pre-Match', '2': '1st Half', '3': 'HT',
  '4': '2nd Half', '5': 'FT', '6': '1ET',
  '7': '2ET', '8': 'ET HT', '9': 'Pens',
};

const LIVE_STATUS_IDS = new Set(['2', '3', '4', '6', '7', '8', '9']);

/** Fetch scores snapshot for a fixture and extract the key display fields */
async function fetchMatchStatus(fixtureId: number): Promise<{
  homeGoals: number; awayGoals: number; minute: number; statusId: string;
}> {
  try {
    const res = await fetch(`/api/txline/scores-snapshot?fixtureId=${fixtureId}`);
    if (!res.ok) return { homeGoals: 0, awayGoals: 0, minute: 0, statusId: '' };
    const data: any[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return { homeGoals: 0, awayGoals: 0, minute: 0, statusId: '' };

    // Latest item that has Stats or Score
    const withData = data
      .filter(d => d.Stats && Object.keys(d.Stats).length > 0)
      .sort((a, b) => (b.Ts || 0) - (a.Ts || 0));
    const latest = withData[0];
    if (!latest) return { homeGoals: 0, awayGoals: 0, minute: 0, statusId: '' };

    // Find the best Score object across ALL snapshot items (not just latest-with-Stats)
    // Score and Stats use DIFFERENT numbering — never mix them.
    const withScore = [...data]
      .filter(d => d.Score)
      .sort((a, b) => (b.Ts || 0) - (a.Ts || 0));
    const bestScore = withScore[0]?.Score;

    // Missing Goals key in Score means 0 (team hasn't scored yet)
    const homeGoals = bestScore?.Participant1?.Total?.Goals ?? 0;
    const awayGoals = bestScore?.Participant2?.Total?.Goals ?? 0;
    const minute = latest?.Clock?.Seconds != null ? Math.floor(latest.Clock.Seconds / 60) : 0;
    const statusId = String(latest?.StatusId ?? '');

    return { homeGoals, awayGoals, minute, statusId };

  } catch {
    return { homeGoals: 0, awayGoals: 0, minute: 0, statusId: '' };
  }
}

/** Extract odds win% from snapshot (sorts by Ts to get latest) */
function extractOdds(oddsData: any[]): { homeWinPct: number; awayWinPct: number } {
  if (!oddsData || oddsData.length === 0) return { homeWinPct: 50, awayWinPct: 50 };
  const sorted = [...oddsData].sort((a, b) => (b.Ts || 0) - (a.Ts || 0));
  const latest = sorted[0];
  if (!latest?.Pct) return { homeWinPct: 50, awayWinPct: 50 };
  const homeNode = latest.Pct.find((p: any) => p.Id === 1);
  const awayNode = latest.Pct.find((p: any) => p.Id === 3);
  return {
    homeWinPct: homeNode?.Pct ?? 50,
    awayWinPct: awayNode?.Pct ?? 50,
  };
}

export default function Home() {
  const router = useRouter();
  const [liveMatches, setLiveMatches] = useState<LiveMatchData[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Fixture[]>([]);
  const [completedMatches, setCompletedMatches] = useState<{ fixture: Fixture; homeGoals: number; awayGoals: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    fetch('/api/txline/fixtures')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch fixtures');
        return res.json();
      })
      .then(async (data: Fixture[]) => {
        if (!Array.isArray(data)) {
          setLoading(false);
          return;
        }

        const now = Date.now();
        // Use 6h window to cover ET + penalties + delays
        const SIX_HOURS = 6 * 60 * 60 * 1000;

        // Candidates that could be live (started within 6h)
        const candidates = data.filter(f => f.StartTime <= now && f.StartTime > now - SIX_HOURS);
        const definitelyUpcoming = data.filter(f => f.StartTime > now);
        const definitelyCompleted = data.filter(f => f.StartTime <= now - SIX_HOURS);

        // Sort upcoming ascending, completed descending
        definitelyUpcoming.sort((a, b) => a.StartTime - b.StartTime);
        definitelyCompleted.sort((a, b) => b.StartTime - a.StartTime);
        setUpcomingMatches(definitelyUpcoming);

        // ── Verify candidates with snapshot and build live list ──────────
        const liveList: LiveMatchData[] = [];
        const confirmedCompleted: typeof definitelyCompleted = [];

        await Promise.all(candidates.map(async f => {
          const [scoreStatus, oddsData] = await Promise.all([
            fetchMatchStatus(f.FixtureId),
            fetch(`/api/txline/odds-snapshot?fixtureId=${f.FixtureId}`)
              .then(r => r.ok ? r.json() : [])
              .catch(() => []),
          ]);

          const isActuallyLive = LIVE_STATUS_IDS.has(scoreStatus.statusId) ||
            // No status yet (pre-match snapshot) but started recently → treat as live
            (scoreStatus.statusId === '' && f.StartTime <= now && f.StartTime > now - 30 * 60 * 1000);

          if (isActuallyLive) {
            const { homeWinPct, awayWinPct } = extractOdds(oddsData);
            const dramaState: MatchDramaState = {
              homeWinPct, awayWinPct,
              minute: scoreStatus.minute,
              homeGoals: scoreStatus.homeGoals,
              awayGoals: scoreStatus.awayGoals,
              homePossessionDanger: false,
              awayPossessionDanger: false,
              recentSignificantEvent: scoreStatus.homeGoals > 0 || scoreStatus.awayGoals > 0,
            };
            liveList.push({
              fixture: f,
              oddsSnapshot: oddsData,
              dramaIndex: computeDramaIndex(dramaState),
              homeGoals: scoreStatus.homeGoals,
              awayGoals: scoreStatus.awayGoals,
              minute: scoreStatus.minute,
              statusId: scoreStatus.statusId,
              homeWinPct,
              awayWinPct,
            });
          } else {
            // Confirmed finished — add to completed with score
            confirmedCompleted.push(f);
          }
        }));

        liveList.sort((a, b) => b.dramaIndex - a.dramaIndex);
        setLiveMatches(liveList);

        // Fetch scores for completed matches (both definite + confirmed from candidates)
        const allCompleted = [...definitelyCompleted, ...confirmedCompleted].sort(
          (a, b) => b.StartTime - a.StartTime
        );

        const completedWithScores = await Promise.all(
          allCompleted.map(async fixture => {
            const score = await fetchMatchStatus(fixture.FixtureId);
            return { fixture, homeGoals: score.homeGoals, awayGoals: score.awayGoals };
          })
        );
        setCompletedMatches(completedWithScores);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    // Refresh homepage every 60s so newly kicked-off matches appear live
    const interval = setInterval(loadData, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ── Card Renderers ─────────────────────────────────────────────────────────

  const renderLiveCard = (match: LiveMatchData) => {
    const { fixture, dramaIndex, homeGoals, awayGoals, minute, statusId, homeWinPct, awayWinPct } = match;
    const isHot = dramaIndex > 70;
    const phaseLabel = STATUS_LABEL[statusId] || 'Live';
    const isRunning = ['2', '4', '6', '7'].includes(statusId);

    return (
      <div
        key={fixture.FixtureId}
        className="w-full bg-bg-surface border border-border-subtle rounded-xl p-4 mb-4 cursor-pointer hover:border-text-secondary transition-all duration-200 group"
        onClick={() => router.push(`/match/${fixture.FixtureId}`)}
      >
        {/* Top row: competition + badges */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] text-text-muted tracking-widest uppercase font-bold">
            🏆 {fixture.Competition}
          </span>
          <div className="flex items-center gap-2">
            {isHot && (
              <span className="bg-high-danger text-white text-[10px] px-2 py-0.5 rounded font-bold animate-pulse">
                HOT
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-high-danger)' }}>
              {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-high-danger animate-pulse inline-block" />}
              {phaseLabel}
            </span>
          </div>
        </div>

        {/* Teams + Score */}
        <div className="flex items-center justify-between mb-4">
          <div className="font-display font-bold text-base flex items-center gap-2 flex-1">
            <span>{getFlag(fixture.Participant1)}</span>
            <span>{fixture.Participant1}</span>
          </div>

          {/* Score Badge */}
          <div className="flex flex-col items-center px-4">
            <div className="font-display font-black text-2xl tracking-tight text-text-primary tabular-nums">
              {homeGoals} – {awayGoals}
            </div>
            {isRunning && minute > 0 && (
              <span className="text-[10px] text-text-muted font-mono">{minute}'</span>
            )}
          </div>

          <div className="font-display font-bold text-base flex items-center gap-2 flex-1 justify-end">
            <span>{fixture.Participant2}</span>
            <span>{getFlag(fixture.Participant2)}</span>
          </div>
        </div>

        {/* Win probability bar */}
        <div className="w-full flex items-center justify-between text-xs font-bold mb-1">
          <span style={{ color: 'var(--color-odds-up)' }}>{homeWinPct.toFixed(1)}%</span>
          <span className="text-[10px] text-text-muted">Win odds</span>
          <span style={{ color: 'var(--color-odds-down)' }}>{awayWinPct.toFixed(1)}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-bg-elevated overflow-hidden flex">
          <div className="h-full bg-odds-up transition-all duration-500" style={{ width: `${homeWinPct}%` }} />
          <div className="w-px h-full bg-bg-base" />
          <div className="h-full bg-odds-down flex-1" />
        </div>

        <div className="mt-3 flex justify-end">
          <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors font-bold uppercase tracking-wider">
            Watch →
          </span>
        </div>
      </div>
    );
  };

  const renderUpcomingCard = (fixture: Fixture) => {
    const date = new Date(fixture.StartTime);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isToday = new Date().toDateString() === date.toDateString();
    const dateStr = isToday ? 'Today' : date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    return (
      <div
        key={fixture.FixtureId}
        className="w-full bg-bg-base border-b border-border-subtle p-4 cursor-pointer hover:bg-bg-surface transition-colors flex justify-between items-center"
        onClick={() => router.push(`/match/${fixture.FixtureId}`)}
      >
        <div className="flex flex-col">
          <span className="text-[10px] text-text-muted uppercase tracking-widest mb-1">{fixture.Competition}</span>
          <span className="font-bold text-sm flex items-center gap-2">
            <span>{getFlag(fixture.Participant1)}</span> {fixture.Participant1} vs <span>{getFlag(fixture.Participant2)}</span> {fixture.Participant2}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-text-secondary font-mono bg-bg-elevated px-2 py-1 rounded">
            {dateStr} {timeStr}
          </div>
          <KickoffReminder
            fixtureId={fixture.FixtureId}
            startTime={fixture.StartTime}
            participant1={fixture.Participant1}
            participant2={fixture.Participant2}
            groupName={getGroupName(fixture.FixtureGroupId)}
          />
        </div>
      </div>
    );
  };

  const renderCompletedCard = ({ fixture, homeGoals, awayGoals }: { fixture: Fixture; homeGoals: number; awayGoals: number }) => {
    const date = new Date(fixture.StartTime);
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return (
      <div
        key={fixture.FixtureId}
        className="w-full bg-bg-base border-b border-border-subtle p-4 cursor-pointer hover:bg-bg-surface transition-colors flex justify-between items-center"
        onClick={() => router.push(`/replay?fixtureId=${fixture.FixtureId}`)}
      >
        <div className="flex flex-col">
          <span className="text-[10px] text-text-muted uppercase tracking-widest mb-1">{fixture.Competition} · {dateStr}</span>
          <span className="font-bold text-sm flex items-center gap-2">
            <span>{getFlag(fixture.Participant1)}</span> {fixture.Participant1}
            <span className="font-black text-text-primary tabular-nums mx-1">{homeGoals} – {awayGoals}</span>
            <span>{getFlag(fixture.Participant2)}</span> {fixture.Participant2}
          </span>
        </div>
        <div className="text-xs text-chain-purple font-bold flex items-center gap-1">
          ▶ Replay
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-bg-base flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-lg h-16 flex items-center justify-between px-4 border-b border-border-subtle bg-bg-surface/80 backdrop-blur sticky top-0 z-30">
        <div className="font-display font-black text-xl tracking-tight text-text-primary">
          Alani
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/watch-party" className="text-text-secondary hover:text-chain-purple flex items-center gap-1 transition-colors">
            <MapIcon size={20} />
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Watch Parties</span>
          </Link>
          <button className="text-text-secondary hover:text-text-primary active:scale-90 transition-all"><Settings size={20} /></button>
          <AlaniWalletConnect />
        </div>
      </header>

      <main className="w-full max-w-lg flex-1 p-4 pb-24">
        {/* Live Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-high-danger animate-pulse" />
            <h2 className="font-display font-bold text-sm tracking-widest uppercase text-text-primary">
              Live · {loading ? '-' : liveMatches.length} matches
            </h2>
          </div>

          <div className="flex flex-col">
            {loading ? (
              <>
                <SkeletonMatchCard />
                <SkeletonMatchCard />
              </>
            ) : liveMatches.length > 0 ? (
              liveMatches.map(m => renderLiveCard(m))
            ) : (
              <div className="text-center py-8 text-text-muted text-sm border border-border-subtle border-dashed rounded-xl">
                No live matches at the moment
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Section */}
        <div className="mb-8">
          <h2 className="font-display font-bold text-sm tracking-widest uppercase text-text-muted mb-4 border-b border-border-subtle pb-2">
            Upcoming
          </h2>
          <div className="flex flex-col rounded-xl overflow-hidden border border-border-subtle">
            {upcomingMatches.length > 0 ? (
              upcomingMatches.map(f => renderUpcomingCard(f))
            ) : (
              <div className="text-center py-8 text-text-muted text-sm bg-bg-base">No upcoming matches.</div>
            )}
          </div>
        </div>

        {/* Completed Section */}
        <div>
          <h2 className="font-display font-bold text-sm tracking-widest uppercase text-text-muted mb-4 border-b border-border-subtle pb-2">
            Completed
          </h2>
          <div className="flex flex-col rounded-xl overflow-hidden border border-border-subtle">
            {completedMatches.length > 0 ? (
              completedMatches.map(m => renderCompletedCard(m))
            ) : (
              <div className="text-center py-8 text-text-muted text-sm bg-bg-base">No completed matches found.</div>
            )}
          </div>
        </div>
      </main>

      <footer className="w-full max-w-lg py-6 flex justify-center border-t border-border-subtle bg-bg-base">
        <div className="text-xs text-text-muted">powered by txline</div>
      </footer>
    </div>
  );
}
