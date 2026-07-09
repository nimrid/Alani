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
  GameState?: number; // 1 = Live
}

interface MatchCardData {
  fixture: Fixture;
  oddsSnapshot?: any;
  dramaIndex: number;
}

export default function Home() {
  const router = useRouter();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [liveMatches, setLiveMatches] = useState<MatchCardData[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Fixture[]>([]);
  const [completedMatches, setCompletedMatches] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch snapshot
    fetch('/api/txline/fixtures')
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch fixtures");
        return res.json();
      })
      .then(async (data: Fixture[]) => {
        // We will just show all fixtures on devnet, but maybe prioritize World Cup
        // Actually, let's just show all for testing to ensure we have data.
        // You can filter by data.filter(f => f.CompetitionId === 72) if desired.
        if (!Array.isArray(data)) {
          console.error("Expected array of fixtures, got:", data);
          setFixtures([]);
          setUpcomingMatches([]);
          setLiveMatches([]);
          setLoading(false);
          return;
        }

        setFixtures(data);

        const now = Date.now();
        const twoAndHalfHours = 2.5 * 60 * 60 * 1000;

        const live = data.filter(f => f.StartTime <= now && f.StartTime > now - twoAndHalfHours);
        const completed = data.filter(f => f.StartTime <= now - twoAndHalfHours);
        const upcoming = data.filter(f => f.StartTime > now);
        
        // Let's sort upcoming by start time ascending
        upcoming.sort((a, b) => a.StartTime - b.StartTime);
        setUpcomingMatches(upcoming);
        
        // Sort completed descending
        completed.sort((a, b) => b.StartTime - a.StartTime);
        setCompletedMatches(completed);
        
        // Fetch odds snapshot for live matches
        const liveWithOdds: MatchCardData[] = [];
        for (const f of live) {
          try {
            const oddsRes = await fetch(`/api/txline/odds-snapshot?fixtureId=${f.FixtureId}`);
            if (!oddsRes.ok) throw new Error("Failed to fetch odds");
            const oddsData = await oddsRes.json();
            
            // Reconstruct a mock MatchDramaState from snapshot 
            // Since we don't have full match state in the snapshot (like goals/possession),
            // we will approximate or leave defaults for drama index.
            // In a real implementation, you might fetch scores snapshot too.
            // For now, we will just use probability gap for Drama Index.
            let homeWinPct = 50;
            let awayWinPct = 50;

            if (oddsData && oddsData.length > 0) {
              // The odds snapshot might return an array of odds states
              const latest = oddsData[oddsData.length - 1];
              if (latest && latest.Pct) {
                // Find Home/Away probabilities. 
                // The structure usually has Pct: [{Id: 1, Pct: 64}, {Id: 2, Pct: 20}, {Id: 3, Pct: 16}]
                const homeNode = latest.Pct.find((p: any) => p.Id === 1);
                const awayNode = latest.Pct.find((p: any) => p.Id === 3);
                if (homeNode) homeWinPct = homeNode.Pct;
                if (awayNode) awayWinPct = awayNode.Pct;
              }
            }

            const dramaState: MatchDramaState = {
              homeWinPct,
              awayWinPct,
              minute: 45, // approximate since we don't have live scores here
              homeGoals: 0,
              awayGoals: 0,
              homePossessionDanger: false,
              awayPossessionDanger: false,
              recentSignificantEvent: false,
            };

            const index = computeDramaIndex(dramaState);

            liveWithOdds.push({
              fixture: f,
              oddsSnapshot: oddsData,
              dramaIndex: index,
            });
          } catch (e) {
            console.error("Odds fetch error", e);
            liveWithOdds.push({ fixture: f, dramaIndex: 0 });
          }
        }

        // Sort by Drama Index descending
        liveWithOdds.sort((a, b) => b.dramaIndex - a.dramaIndex);
        setLiveMatches(liveWithOdds);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const renderLiveCard = (match: MatchCardData) => {
    const { fixture, dramaIndex } = match;
    const isHot = dramaIndex > 70;

    let homeWinPct = 50;
    let awayWinPct = 50;
    if (match.oddsSnapshot && match.oddsSnapshot.length > 0) {
      const latest = match.oddsSnapshot[match.oddsSnapshot.length - 1];
      if (latest && latest.Pct) {
        const homeNode = latest.Pct.find((p: any) => p.Id === 1);
        const awayNode = latest.Pct.find((p: any) => p.Id === 3);
        if (homeNode) homeWinPct = homeNode.Pct;
        if (awayNode) awayWinPct = awayNode.Pct;
      }
    }

    const startDate = new Date(fixture.StartTime);
    const dateStr = startDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <div 
        key={fixture.FixtureId}
        className="w-full bg-bg-surface border border-border-subtle rounded-xl p-4 mb-4 cursor-pointer hover:border-text-secondary transition-colors"
        onClick={() => router.push(`/match/${fixture.FixtureId}`)}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="text-xs text-text-muted tracking-widest uppercase font-bold">
            🏆 {fixture.Competition} · LIVE · {dateStr} {timeStr}
          </div>
          {isHot && (
            <div className="bg-high-danger text-white text-[10px] px-2 py-0.5 rounded font-bold animate-pulse">
              HOT
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="font-display font-bold text-lg flex items-center gap-2">
            <span>{getFlag(fixture.Participant1)}</span>
            {fixture.Participant1}
          </div>
          <div className="text-text-muted font-mono px-4 text-sm">VS</div>
          <div className="font-display font-bold text-lg flex items-center gap-2">
            <span>{getFlag(fixture.Participant2)}</span>
            {fixture.Participant2}
          </div>
        </div>

        <div className="w-full flex items-center justify-between text-xs font-bold mb-1">
          <span style={{ color: 'var(--color-odds-up)' }}>{homeWinPct.toFixed(1)}%</span>
          <span style={{ color: 'var(--color-odds-down)' }}>{awayWinPct.toFixed(1)}%</span>
        </div>
        
        <div className="w-full h-2 rounded-full bg-bg-elevated overflow-hidden flex">
          <div 
            className="h-full bg-odds-up"
            style={{ width: `${homeWinPct}%` }}
          />
          <div className="w-0.5 h-full bg-bg-base" />
          <div 
            className="h-full bg-odds-down flex-1"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <span className="text-xs text-text-secondary hover:text-text-primary transition-colors font-bold uppercase tracking-wider flex items-center gap-1">
            Watch <span>→</span>
          </span>
        </div>
      </div>
    );
  };

  const renderUpcomingCard = (fixture: Fixture) => {
    // Format StartTime (it's in ms)
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

  const renderCompletedCard = (fixture: Fixture) => {
    const date = new Date(fixture.StartTime);
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return (
      <div 
        key={fixture.FixtureId}
        className="w-full bg-bg-base border-b border-border-subtle p-4 cursor-pointer hover:bg-bg-surface transition-colors flex justify-between items-center"
        onClick={() => router.push(`/match/${fixture.FixtureId}`)}
      >
        <div className="flex flex-col">
          <span className="text-[10px] text-text-muted uppercase tracking-widest mb-1">{fixture.Competition} · {dateStr}</span>
          <span className="font-bold text-sm flex items-center gap-2">
            <span>{getFlag(fixture.Participant1)}</span> {fixture.Participant1} vs <span>{getFlag(fixture.Participant2)}</span> {fixture.Participant2}
          </span>
        </div>
        <div className="text-xs text-chain-purple font-bold flex items-center gap-1">
          ▶ Highlights
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-bg-base flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-lg h-16 flex items-center justify-between px-4 border-b border-border-subtle bg-bg-surface/80 backdrop-blur sticky top-0 z-30">
        <div className="font-display font-black text-xl tracking-tight text-text-primary">
          pulse
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/watch-party" className="text-text-secondary hover:text-chain-purple flex items-center gap-1 transition-colors">
            <MapIcon size={20} />
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Watch Parties</span>
          </Link>
          <button className="text-text-secondary hover:text-text-primary"><Settings size={20} /></button>
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
                <SkeletonMatchCard />
              </>
            ) : liveMatches.length > 0 ? (
              liveMatches.map(m => renderLiveCard(m))
            ) : (
              <div className="text-center py-8 text-text-muted text-sm border border-border-subtle border-dashed rounded-xl">
                No live matches at the moment.
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
              <div className="text-center py-8 text-text-muted text-sm bg-bg-base">
                No upcoming matches.
              </div>
            )}
          </div>
        </div>

        {/* Completed Section */}
        <div>
          <h2 className="font-display font-bold text-sm tracking-widest uppercase text-text-muted mb-4 border-b border-border-subtle pb-2">
            Completed (Highlights)
          </h2>
          <div className="flex flex-col rounded-xl overflow-hidden border border-border-subtle">
            {completedMatches.length > 0 ? (
              completedMatches.map(f => renderCompletedCard(f))
            ) : (
              <div className="text-center py-8 text-text-muted text-sm bg-bg-base">
                No completed matches found.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-lg py-6 flex justify-center border-t border-border-subtle bg-bg-base">
        <div className="text-xs text-text-muted">
          powered by txline
        </div>
      </footer>
    </div>
  );
}
