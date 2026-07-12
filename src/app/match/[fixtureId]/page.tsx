'use client';

import React, { useEffect, useState, use, Suspense } from 'react';

import { AlaniMatchHeader } from '@/components/alani/AlaniMatchHeader';
import { AlaniDangerMeter } from '@/components/alani/AlaniDangerMeter';
import { AlaniEventFeed } from '@/components/alani/AlaniEventFeed';
import { AlaniDrawer } from '@/components/alani/AlaniDrawer';
import { TheAnalyst } from '@/components/alani/TheAnalyst';
import { useTxLineStream } from '@/hooks/useTxLineStream';
import { usePossessionStore, useScoreStore, useLineupStore, useEventStore, AlaniEvent, EventType } from '@/store/matchStore';
import { AlaniProbabilityBar } from '@/components/alani/AlaniProbabilityBar';
import { useTimelineStore } from '@/store/timelineStore';
import { detectEvents } from '@/lib/alani/eventDetector';
import { getFlag, getGroupName } from '@/lib/alani/utils';
import { triggerNarration } from '@/lib/alani/narration';



function MatchContent({ fixtureId }: { fixtureId: string }) {

  const [fixtureData, setFixtureData] = useState<any>(null);

  // Initialize live stream — pass team names once fixtureData resolves
  const homeTeamName = fixtureData?.Participant1 || 'Home';
  const awayTeamName = fixtureData?.Participant2 || 'Away';
  useTxLineStream(fixtureId, 'scores', homeTeamName, awayTeamName);
  useTxLineStream(fixtureId, 'odds');

  useEffect(() => {
    fetch('/api/txline/fixtures')
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch fixture metadata");
        return res.json();
      })
      .then(data => {
        const fixture = data?.find?.((f: any) => f.FixtureId.toString() === fixtureId);
        if (fixture) setFixtureData(fixture);
      })
      .catch(err => console.error("Failed to fetch fixture metadata", err));
  }, [fixtureId]);

  const possessionType = usePossessionStore((state) => state.possessionType);
  const possibleEventSoccer = usePossessionStore((state) => state.possibleEventSoccer);
  const statusSoccerId = useScoreStore((state) => state.statusSoccerId);
  const setScoreData = useScoreStore((state) => state.setScoreData);
  const setPossession = usePossessionStore((state) => state.setPossession);
  const setLineups = useLineupStore((state) => state.setLineups);
  const addEvent = useEventStore((state) => state.addEvent);
  const events = useEventStore((state) => state.events);
  const [analystCollapsed, setAnalystCollapsed] = useState(false);
  // StatusId: 1=pre, 2=1st, 3=HT, 4=2nd, 5=FT, 6=1ET, 7=2ET, 8=ET-HT, 9=Pens
  const isFinished = ['5', '9'].includes(String(statusSoccerId));

  useEffect(() => {
    return () => {
      useScoreStore.getState().clear();
      usePossessionStore.getState().clear();
      useLineupStore.getState().clear();
      useEventStore.getState().clear();
      useTimelineStore.getState().clear();
    };
  }, [fixtureId]);

  useEffect(() => {
    const loadSnapshot = () => {
      fetch(`/api/txline/scores-snapshot?fixtureId=${fixtureId}`)
        .then(res => {
          if (!res.ok) {
            console.warn('Snapshot unavailable for fixture', fixtureId, res.status);
            return null;
          }
          return res.json();
        })
        .then(data => {
          if (!data || !Array.isArray(data) || data.length === 0) return;


          // ── Lineups ─────────────────────────────────────────────────────
          const lineupItem = data.find((d: any) => d.Action === 'lineups' && d.Lineups);
          if (lineupItem) setLineups(lineupItem.Lineups);

          // ── Latest score & status ────────────────────────────────────────
          // Sort descending by Ts to get the most recent item that has Stats
          const withStats = data
            .filter((d: any) => d.Stats && Object.keys(d.Stats).length > 0)
            .sort((a: any, b: any) => (b.Ts || 0) - (a.Ts || 0));

          const latestWithStats = withStats[0];
          if (latestWithStats) {
            const stats = latestWithStats.Stats;
            const score: any = latestWithStats.Score;

            // Primary: use Score.Participant1.Total.Goals (most reliable, includes ET/pens)
            // Fallback: Stats["2"] = home goals, Stats["1002"] = away goals
            const homeGoals = score?.Participant1?.Total?.Goals ?? stats?.['2'] ?? 0;
            const awayGoals = score?.Participant2?.Total?.Goals ?? stats?.['1002'] ?? 0;

            // StatusId: 1=pre, 2=1st, 3=HT, 4=2nd, 5=FT, 6=1ET, 7=2ET, 8=ET-HT, 9=Pens
            const statusId = String(latestWithStats.StatusId ?? '');
            const clock = latestWithStats.Clock;
            const liveMinutes = clock?.Seconds != null ? Math.floor(clock.Seconds / 60) : 0;

            setScoreData({
              scoreSoccer: {
                Participant1: { Total: { Goals: homeGoals } },
                Participant2: { Total: { Goals: awayGoals } },
              },
              statusSoccerId: statusId,
              minutes: liveMinutes,
              participant1Id: latestWithStats.Participant1Id ?? null,
              participant2Id: latestWithStats.Participant2Id ?? null,
            });

            // Possession type from latest possession action
            const possessionItem = data
              .filter((d: any) => ['safe_possession', 'attack_possession', 'danger_possession', 'high_danger_possession'].includes((d.Action || '').toLowerCase()))
              .sort((a: any, b: any) => (b.Ts || 0) - (a.Ts || 0))[0];

            if (possessionItem) {
              const actionToPossession: Record<string, any> = {
                safe_possession: 'SafePossession',
                attack_possession: 'AttackPossession',
                danger_possession: 'DangerPossession',
                high_danger_possession: 'HighDangerPossession',
              };
              setPossession(actionToPossession[possessionItem.Action?.toLowerCase()] || 'None');
            }
          }

          // ── Historical events (only on first load) ───────────────────────
          if (useEventStore.getState().events.length === 0) {
            const chronologicalData = [...data].sort((a: any, b: any) => (a.Ts || 0) - (b.Ts || 0));
            const historyEvents: AlaniEvent[] = [];
            let prevItem: any = null;

            for (const item of chronologicalData) {
              const newEvs = detectEvents(item, prevItem);
              for (const ev of newEvs) {
                historyEvents.push({ ...ev, narratedText: '', narrateStatus: 'pending' } as AlaniEvent);
              }
              prevItem = item;
            }

            historyEvents.forEach(ev => addEvent(ev));

            // Claude narration: only for the 3 most recent meaningful events
            const narratableEvents = historyEvents.filter(ev => !['KICKOFF', 'HALFTIME', 'FULLTIME', 'SUBSTITUTION'].includes(ev.type));
            const recent = narratableEvents.slice(-3);

            for (const ev of recent) {
              triggerNarration(ev, fixtureId, {
                homeTeamName: fixtureData?.Participant1 || 'Home',
                awayTeamName: fixtureData?.Participant2 || 'Away',
              });
            }

            // Older events get a simple text fallback
            const older = historyEvents.filter(ev => !recent.includes(ev));
            for (const ev of older) {
              useEventStore.getState().updateEvent(ev.id, {
                narratedText: ev.minute > 0 ? `${ev.type.replace(/_/g, ' ')} at ${ev.minute}'` : ev.type.replace(/_/g, ' '),
                narrateStatus: 'complete',
              });
            }
          }
        })
        .catch(console.error);
    };

    loadSnapshot();
    const pollInterval = setInterval(loadSnapshot, 30_000);
    return () => clearInterval(pollInterval);
  }, [fixtureId, setLineups, setScoreData, setPossession]);

  // Derive background tint from possession state
  const getBgTint = () => {
    if (possibleEventSoccer?.Goal) {
      return 'rgba(255, 215, 0, 0.05)';
    }
    switch (possessionType) {
      case 'HighDangerPossession': return 'rgba(255, 45, 45, 0.04)';
      case 'DangerPossession': return 'rgba(196, 59, 26, 0.02)';
      case 'AttackPossession': return 'rgba(196, 125, 26, 0.02)';
      default: return 'transparent';
    }
  };

  return (
    <div 
      className="relative flex flex-col lg:flex-row w-full h-[100dvh] overflow-hidden bg-bg-base transition-colors duration-400 ease-in-out"
      style={{ backgroundColor: 'var(--color-bg-base)' }}
    >
      <div 
        className="absolute inset-0 pointer-events-none transition-colors duration-400 ease-in-out"
        style={{ backgroundColor: getBgTint() }}
      />

      <div className="flex-1 flex flex-col w-full h-full relative z-10 overflow-hidden">
        <div className="z-20 w-full shrink-0 relative">
        <AlaniMatchHeader 
          competitionName={fixtureData?.Competition}
          groupName={getGroupName(fixtureData?.FixtureGroupId)}
          homeTeamName={fixtureData?.Participant1 || "HOME"}
          awayTeamName={fixtureData?.Participant2 || "AWAY"}
          loading={!fixtureData}
        />
      </div>

      <div className="z-10 w-full lg:flex-1 shrink-0 flex items-center justify-center pt-2 pb-4 min-h-[200px]">
        {isFinished ? (
          <div className="w-full max-w-sm px-4 flex flex-col items-center animate-in fade-in duration-500">
            <AlaniProbabilityBar 
              homeTeamName={fixtureData?.Participant1 || "Home"}
              awayTeamName={fixtureData?.Participant2 || "Away"}
            />
          </div>
        ) : (
          <AlaniDangerMeter loading={!fixtureData} />
        )}
      </div>

        <div className="lg:hidden flex-1 overflow-hidden z-10 w-full max-w-lg mx-auto flex flex-col relative min-h-0">
          <AlaniEventFeed 
            homeTeamName={fixtureData?.Participant1 || "Home"}
            awayTeamName={fixtureData?.Participant2 || "Away"}
            loading={!fixtureData}
          />
        </div>

        <AlaniDrawer 
          homeTeamName={fixtureData?.Participant1 || "Home"}
          awayTeamName={fixtureData?.Participant2 || "Away"}
          fixtureId={fixtureId}
          isFinished={isFinished}
        />
      </div>

      {/* Desktop Sidebar for Match Events */}
      <div className="hidden lg:flex w-[400px] shrink-0 border-l border-border-subtle bg-bg-surface/30 backdrop-blur z-20 flex-col">
        <AlaniEventFeed 
          homeTeamName={fixtureData?.Participant1 || "Home"}
          awayTeamName={fixtureData?.Participant2 || "Away"}
          loading={!fixtureData}
        />
      </div>

      <TheAnalyst 
        eventQueue={events}
        isReplayMode={true}
        collapsed={analystCollapsed}
        onToggleCollapse={() => setAnalystCollapsed(!analystCollapsed)}
      />
    </div>
  );
}

export default function MatchPage({ params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = use(params);
  
  return (
    <Suspense fallback={<div className="h-screen w-full bg-bg-base animate-pulse" />}>
      <MatchContent fixtureId={fixtureId} />
    </Suspense>
  );
}
