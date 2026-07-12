import { EventType, AlaniEvent } from '@/store/matchStore';

// TxLINE stat IDs for goals
// Key "2" = home team (Participant1) total goals
// Key "1002" = away team (Participant2) total goals
const STAT_HOME_GOALS = '2';
const STAT_AWAY_GOALS = '1002';

/** Extract goals from the TxLINE Stats object */
export function extractScore(stats: Record<string, number> | undefined): { home: number; away: number } {
  if (!stats) return { home: 0, away: 0 };
  return {
    home: stats[STAT_HOME_GOALS] ?? 0,
    away: stats[STAT_AWAY_GOALS] ?? 0,
  };
}

/** Convert Clock.Seconds to a match minute */
export function clockToMinute(clock: { Running?: boolean; Seconds?: number } | undefined): number {
  if (!clock || clock.Seconds == null) return 0;
  return Math.floor(clock.Seconds / 60);
}

export function detectEvents(current: any, previous: any | null): Omit<AlaniEvent, 'narratedText' | 'narrateStatus'>[] {
  const newEvents: Omit<AlaniEvent, 'narratedText' | 'narrateStatus'>[] = [];
  
  if (!current) return newEvents;

  const ts = current.Ts || current.ts || Date.now();
  // Minute comes from Clock.Seconds (actual TxLINE format)
  const minute = clockToMinute(current.Clock || current.clock);
  const action = (current.Action || current.action || '').toLowerCase();
  const data = current.Data || current.data || {};
  const statusId = current.StatusId ?? current.statusId ?? current.statusSoccerId ?? current.StatusSoccerId;
  const prevStatusId = previous?.StatusId ?? previous?.statusId ?? previous?.statusSoccerId ?? previous?.StatusSoccerId;
  const stats = current.Stats || current.stats;
  const participant = current.Participant ?? current.participant;

  // ── Phase Transitions ──────────────────────────────────────────────────────
  if (statusId !== undefined && statusId !== prevStatusId) {
    const cur = String(statusId);
    const prev = String(prevStatusId ?? '');
    // StatusId: 1=pre, 2=1st half, 3=HT, 4=2nd half, 5=FT, 6=1ET, 7=2ET, 8=ET-HT, 9=Penalties
    if (action === 'kickoff' || (prev === '1' && cur === '2') || (prev === '3' && cur === '4') || (prev === '8' && cur === '6') || (prev === '8' && cur === '7')) {
      newEvents.push({ id: `kickoff-${ts}`, type: 'KICKOFF', ts, minute, data: { ...current, stats }, oddsImpact: null });
    } else if (cur === '3' || cur === '8') {
      newEvents.push({ id: `ht-${ts}`, type: 'HALFTIME', ts, minute, data: { ...current, stats }, oddsImpact: null });
    } else if (cur === '5') {
      newEvents.push({ id: `ft-${ts}`, type: 'FULLTIME', ts, minute, data: { ...current, stats }, oddsImpact: null });
    }
  }

  // ── Direct action-based events ─────────────────────────────────────────────
  switch (action) {
    case 'goal': {
      const type = data.GoalType === 'OwnGoal' ? 'OWN_GOAL' : 'GOAL';
      newEvents.push({ id: `goal-${ts}`, type, ts, minute, data: { ...data, participant, stats }, oddsImpact: null });
      break;
    }
    case 'yellow_card':
      newEvents.push({ id: `yellow-${ts}`, type: 'YELLOW_CARD', ts, minute, data: { ...data, participant, stats }, oddsImpact: null });
      break;
    case 'red_card':
      newEvents.push({ id: `red-${ts}`, type: 'RED_CARD', ts, minute, data: { ...data, participant, stats }, oddsImpact: null });
      break;
    case 'substitution':
      newEvents.push({ id: `sub-${ts}`, type: 'SUBSTITUTION', ts, minute, data: { ...data, participant, stats }, oddsImpact: null });
      break;
    case 'free_kick':
      if (data.FreeKickType === 'Offside') {
        newEvents.push({ id: `offside-${ts}`, type: 'OFFSIDE', ts, minute, data: { ...data, participant, stats }, oddsImpact: null });
      } else {
        newEvents.push({ id: `foul-${ts}`, type: 'FOUL', ts, minute, data: { ...data, participant, stats }, oddsImpact: null });
      }
      break;
    case 'shot':
      newEvents.push({ id: `shot-${ts}`, type: 'SHOT', ts, minute, data: { ...data, participant, stats }, oddsImpact: null });
      break;
    case 'var':
      newEvents.push({ id: `var-${ts}`, type: 'VAR_TRIGGERED', ts, minute, data: { ...data, participant, stats }, oddsImpact: null });
      break;
    case 'var_end':
      newEvents.push({ id: `var-end-${ts}`, type: 'VAR_DECISION', ts, minute, data: { ...data, participant, stats }, oddsImpact: null });
      break;
    case 'penalty':
      newEvents.push({ id: `pen-${ts}`, type: 'PENALTY_AWARDED', ts, minute, data: { ...data, participant, stats }, oddsImpact: null });
      break;
  }

  return newEvents;
}
