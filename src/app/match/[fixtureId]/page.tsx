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



function MatchContent({ fixtureId }: { fixtureId: string }) {

  const [fixtureData, setFixtureData] = useState<any>(null);

  // Initialize live stream
  useTxLineStream(fixtureId, 'scores');
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
  const isFinished = statusSoccerId === 'F2' || String(statusSoccerId) === '4' || String(statusSoccerId) === '8';

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
    fetch(`/api/txline/scores-snapshot?fixtureId=${fixtureId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch scores snapshot");
        return res.json();
      })
      .then(data => {
          if (Array.isArray(data)) {
            const lineupEvent = [...data].reverse().find((d: any) => d.Lineups || d.lineups);
            if (lineupEvent) {
              setLineups(lineupEvent.Lineups || lineupEvent.lineups);
            }
            
            const latestScore = data[data.length - 1];
            if (latestScore) {
              const scoreSoccer = latestScore.scoreSoccer || latestScore.ScoreSoccer || latestScore.Score;
              const statusSoccerId = latestScore.statusSoccerId || latestScore.StatusSoccerId || latestScore.StatusId;
              const dataSoccer = latestScore.dataSoccer || latestScore.DataSoccer || latestScore.Data;
              const participant1Id = latestScore.participant1Id || latestScore.Participant1Id;
              const participant2Id = latestScore.participant2Id || latestScore.Participant2Id;
              const possessionType = latestScore.possessionType || latestScore.PossessionType;
              const possibleEventSoccer = latestScore.possibleEventSoccer || latestScore.PossibleEventSoccer || latestScore.PossibleEvent;

              if (scoreSoccer || statusSoccerId || dataSoccer) {
                setScoreData({
                  scoreSoccer: scoreSoccer,
                  statusSoccerId: statusSoccerId,
                  minutes: dataSoccer?.Minutes,
                  participant1Id: participant1Id,
                  participant2Id: participant2Id,
                });
              }
              if (possessionType) {
                setPossession(possessionType, possibleEventSoccer);
              }

              // Extract historical events for the feed
              if (useEventStore.getState().events.length === 0) {
                let prevData = null;
                const historyEvents: AlaniEvent[] = [];
                const chronologicalData = [...data].sort((a: any, b: any) => {
                  const tA = a.Ts || a.ts || 0;
                  const tB = b.Ts || b.ts || 0;
                  return tA - tB;
                });
                for (const item of chronologicalData) {
                  const pType = item.possessionType || item.PossessionType;
                  const pEvents = item.possibleEventSoccer || item.PossibleEventSoccer || item.PossibleEvent;
                  const score = item.scoreSoccer || item.ScoreSoccer || item.Score;
                  const status = item.statusSoccerId || item.StatusSoccerId || item.StatusId;
                  const dataSoc = item.dataSoccer || item.DataSoccer || item.Data;
                  const p1 = item.participant1Id || item.Participant1Id;
                  const p2 = item.participant2Id || item.Participant2Id;
                  
                  const eventData = { ...item, possessionType: pType, possibleEventSoccer: pEvents, scoreSoccer: score, statusSoccerId: status, dataSoccer: dataSoc, participant1Id: p1, participant2Id: p2 };
                  
                  // detectEvents is needed here, so we must import it if not imported. Wait, I should import it at the top of the file.
                  
                  const newEvs = detectEvents(eventData, prevData);
                  for (const ev of newEvs) {
                    historyEvents.push({
                      ...ev,
                      narratedText: `${ev.type.replace('_', ' ')} recorded at ${ev.minute}'`,
                      narrateStatus: 'complete'
                    } as AlaniEvent);
                  }
                  prevData = eventData;
                }
                historyEvents.forEach(ev => addEvent(ev));
              }
            }
          }
        })
        .catch(console.error);
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
