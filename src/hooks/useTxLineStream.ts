import { useEffect, useRef, useCallback } from 'react';
import { usePossessionStore, useScoreStore, useEventStore, useLineupStore, AlaniEvent } from '@/store/matchStore';
import { useOddsStore } from '@/store/oddsStore';
import { detectEvents, clockToMinute, extractScore } from '@/lib/alani/eventDetector';
import { getCrowdAudio } from '@/lib/alani/crowdAudio';
import { useConnectionStore } from '@/store/connectionStore';
import { triggerNarration } from '@/lib/alani/narration';

type StreamType = 'scores' | 'odds';

interface StreamState {
  connected: boolean;
  lastEventId: string | null;
}

// Map TxLINE action strings to possession types
const ACTION_TO_POSSESSION: Record<string, string> = {
  safe_possession: 'SafePossession',
  attack_possession: 'AttackPossession',
  danger_possession: 'DangerPossession',
  high_danger_possession: 'HighDangerPossession',
};

export function useTxLineStream(
  fixtureId: number | string,
  type: StreamType,
  homeTeamName?: string,
  awayTeamName?: string
): StreamState {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const prevDataRef = useRef<any>(null);

  const connected = useConnectionStore(
    (state) => type === 'scores' ? state.scoresConnected : state.oddsConnected
  );

  const connect = useCallback(() => {
    if (fixtureId === 'disabled') return;
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
      retryCountRef.current = 0;
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (type === 'scores') {
          const action = (data.Action || data.action || '').toLowerCase();
          const stats: Record<string, number> | undefined = data.Stats || data.stats;
          const clock = data.Clock || data.clock;
          const statusId = data.StatusId ?? data.statusId;
          const lineups = data.Lineups || data.lineups;

          // ── Lineups ──────────────────────────────────────────────────────
          if (action === 'lineups' && lineups) {
            useLineupStore.getState().setLineups(lineups);
          }

          // ── Score (only update when we have a Score object) ──────────────
          const score: Record<string, any> | undefined = data.Score || data.score;
          if (score) {
            // Score and Stats use DIFFERENT numbering — never mix them.
            // Missing Goals key in Score means 0, not "use Stats fallback".
            const home = score.Participant1?.Total?.Goals ?? 0;
            const away = score.Participant2?.Total?.Goals ?? 0;
            const liveMinutes = clockToMinute(clock);

            useScoreStore.getState().setScoreData({
              scoreSoccer: {
                Participant1: { Total: { Goals: home } },
                Participant2: { Total: { Goals: away } },
              },
              statusSoccerId: statusId != null ? String(statusId) : undefined,
              minutes: liveMinutes,
              participant1Id: data.Participant1Id ?? null,
              participant2Id: data.Participant2Id ?? null,
            });
          } else if (statusId != null) {
            // Status-only update (no Score yet) — just update the phase
            useScoreStore.getState().setScoreData({
              statusSoccerId: String(statusId),
            });
          }


          // ── Possession ───────────────────────────────────────────────────
          if (action in ACTION_TO_POSSESSION) {
            const possessionType = ACTION_TO_POSSESSION[action] as any;
            usePossessionStore.getState().setPossession(possessionType);
            getCrowdAudio().setPossessionType(possessionType);
          }

          // ── Events ───────────────────────────────────────────────────────
          const newEvents = detectEvents(data, prevDataRef.current);
          prevDataRef.current = data;

          const currentScore = useScoreStore.getState().scoreSoccer;
          const homeG = currentScore?.Participant1?.Total?.Goals ?? 0;
          const awayG = currentScore?.Participant2?.Total?.Goals ?? 0;

          for (const ev of newEvents) {
            const evWithScore = { ...ev, score: { home: homeG, away: awayG } } as AlaniEvent;
            useEventStore.getState().addEvent(evWithScore);
            getCrowdAudio().playEvent(ev.type);

            if (ev.type === 'SUBSTITUTION') {
              useLineupStore.getState().updateLineupSub(ev.data?.PlayerInId, ev.data?.PlayerOutId);
            }

            if (!['KICKOFF', 'HALFTIME', 'FULLTIME', 'SUBSTITUTION'].includes(ev.type)) {
              triggerNarration(ev as AlaniEvent, fixtureId.toString(), {
                homeTeamName: homeTeamName || 'Home',
                awayTeamName: awayTeamName || 'Away',
              });
            }
          }
        } else if (type === 'odds') {
          const payload = Array.isArray(data) ? data[0] : data;
          if (payload?.Pct) {
            useOddsStore.getState().updateOdds(payload.Pct, payload.InRunning);
          }
        }
      } catch (err) {
        console.error(`Failed to parse ${type} event:`, err);
      }
    };

    es.addEventListener('heartbeat', () => { /* ignore */ });

    es.onerror = () => {
      if (type === 'scores') useConnectionStore.getState().setScoresConnected(false);
      if (type === 'odds') useConnectionStore.getState().setOddsConnected(false);
      es.close();

      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
      retryCountRef.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        if (document.visibilityState === 'visible') connect();
      }, delay);
    };
  }, [fixtureId, type, homeTeamName, awayTeamName]);

  useEffect(() => {
    connect();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const isConnected = type === 'scores'
          ? useConnectionStore.getState().scoresConnected
          : useConnectionStore.getState().oddsConnected;
        if (!isConnected) connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connect, type]);

  return { connected, lastEventId: null };
}
