import { useEffect, useRef, useState, useCallback } from 'react';
import { usePossessionStore, useScoreStore, useEventStore, useLineupStore, AlaniEvent } from '@/store/matchStore';
import { useOddsStore } from '@/store/oddsStore';
import { detectEvents } from '@/lib/alani/eventDetector';
import { getCrowdAudio } from '@/lib/alani/crowdAudio';
import { useConnectionStore } from '@/store/connectionStore';

type StreamType = 'scores' | 'odds';

interface StreamState {
  connected: boolean;
  lastEventId: string | null;
}

export function useTxLineStream(fixtureId: number | string, type: StreamType): StreamState {
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const prevDataRef = useRef<any>(null);
  
  const connected = useConnectionStore((state) => type === 'scores' ? state.scoresConnected : state.oddsConnected);

  const connect = useCallback(() => {
    if (fixtureId === 'disabled') return;
    
    // Reset previous data on new connection to avoid cross-fixture event bleed
    prevDataRef.current = null;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = new URL(`/api/txline/${type}-stream`, window.location.origin);
    url.searchParams.set('fixtureId', fixtureId.toString());

    const es = new EventSource(url.toString());
    eventSourceRef.current = es;

    es.onopen = () => {
      if (type === 'scores') useConnectionStore.getState().setScoresConnected(true);
      if (type === 'odds') useConnectionStore.getState().setOddsConnected(true);
      retryCountRef.current = 0; // reset
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (type === 'scores') {
          const possessionType = data.possessionType || data.PossessionType;
          const possibleEventSoccer = data.possibleEventSoccer || data.PossibleEventSoccer || data.PossibleEvent;
          const scoreSoccer = data.scoreSoccer || data.ScoreSoccer || data.Score;
          const statusSoccerId = data.statusSoccerId || data.StatusSoccerId || data.StatusId;
          const dataSoccer = data.dataSoccer || data.DataSoccer || data.Data;
          const lineups = data.lineups || data.Lineups;
          const participant1Id = data.participant1Id || data.Participant1Id;
          const participant2Id = data.participant2Id || data.Participant2Id;

          if (possessionType) {
            usePossessionStore.getState().setPossession(possessionType, possibleEventSoccer);
            getCrowdAudio().setPossessionType(possessionType);
          }

          if (scoreSoccer || statusSoccerId || dataSoccer) {
            useScoreStore.getState().setScoreData({
              scoreSoccer: scoreSoccer,
              statusSoccerId: statusSoccerId,
              minutes: dataSoccer?.Minutes,
              participant1Id: participant1Id,
              participant2Id: participant2Id,
            });
          }

          if (lineups) {
            useLineupStore.getState().setLineups(lineups);
          }

          // Convert to expected format for detectEvents if necessary, or just pass data
          const eventData = { ...data, possessionType, possibleEventSoccer, scoreSoccer, statusSoccerId, dataSoccer, lineups, participant1Id, participant2Id };
          const newEvents = detectEvents(eventData, prevDataRef.current);
          prevDataRef.current = eventData;

          for (const ev of newEvents) {
            useEventStore.getState().addEvent(ev as AlaniEvent);
            getCrowdAudio().playEvent(ev.type);

            if (ev.type === 'SUBSTITUTION') {
              useLineupStore.getState().updateLineupSub(ev.data.PlayerInId, ev.data.PlayerOutId);
            }
            
            if (!['KICKOFF', 'HALFTIME', 'FULLTIME', 'SUBSTITUTION'].includes(ev.type)) {
               triggerNarration(ev as AlaniEvent, fixtureId.toString());
            }
          }
        } else if (type === 'odds') {
          const payload = Array.isArray(data) ? data[0] : data;
          if (payload && payload.Pct) {
            useOddsStore.getState().updateOdds(payload.Pct, payload.InRunning);
          }
        }
      } catch (err) {
        console.error(`Failed to parse ${type} event:`, err);
      }
    };

    es.addEventListener('heartbeat', () => {
      // Ignore
    });

    es.onerror = () => {
      if (type === 'scores') useConnectionStore.getState().setScoresConnected(false);
      if (type === 'odds') useConnectionStore.getState().setOddsConnected(false);
      es.close();

      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
      retryCountRef.current++;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          connect();
        }
      }, delay);
    };
  }, [fixtureId, type]);

  useEffect(() => {
    connect();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const isCurrentlyConnected = type === 'scores' ? useConnectionStore.getState().scoresConnected : useConnectionStore.getState().oddsConnected;
        if (!isCurrentlyConnected) {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connect, type]);

  return { connected, lastEventId: null };
}

async function triggerNarration(event: AlaniEvent, fixtureId: string) {
  const { updateEvent } = useEventStore.getState();
  updateEvent(event.id, { narrateStatus: 'pending' });

  try {
    const payload = {
      eventType: event.type,
      minute: event.minute,
      team1Name: 'Home',
      team2Name: 'Away',
      playerName: event.data.PlayerId?.toString() || null,
      goalType: event.data.GoalType || null,
      varDecision: event.type === 'VAR_DECISION' ? (event.data.Goal ? 'goal awarded' : 'goal disallowed') : null
    };

    const res = await fetch('/api/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('API Error');

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let currentText = '';

    updateEvent(event.id, { narrateStatus: 'streaming' });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      currentText += decoder.decode(value, { stream: true });
      updateEvent(event.id, { narratedText: currentText });
    }

    updateEvent(event.id, { narrateStatus: 'complete' });
  } catch (err) {
    console.error('Narration failed', err);
    updateEvent(event.id, { 
      narratedText: 'Event occurred, awaiting details.', 
      narrateStatus: 'error' 
    });
  }
}

