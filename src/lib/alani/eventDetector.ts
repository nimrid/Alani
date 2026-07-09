import { EventType, AlaniEvent } from '@/store/matchStore';

export function detectEvents(current: any, previous: any | null): Omit<AlaniEvent, 'narratedText' | 'narrateStatus'>[] {
  const newEvents: Omit<AlaniEvent, 'narratedText' | 'narrateStatus'>[] = [];
  
  if (!current) return newEvents;

  const ts = current.Ts || current.ts || Date.now();
  const minute = current.dataSoccer?.Minutes || 0;
  
  // Phase Transitions
  const curStatus = current.statusSoccerId;
  const prevStatus = previous?.statusSoccerId;
  
  if (curStatus && curStatus !== prevStatus) {
    if (prevStatus === 'NS2' && curStatus === 'H11') {
      newEvents.push({ id: `kickoff-${ts}`, type: 'KICKOFF', ts, minute, data: current, oddsImpact: null });
    } else if (prevStatus === 'H11' && curStatus === 'HT2') {
      newEvents.push({ id: `ht-${ts}`, type: 'HALFTIME', ts, minute, data: current, oddsImpact: null });
    } else if (prevStatus === 'HT2' && curStatus === 'H21') {
      newEvents.push({ id: `h2-${ts}`, type: 'KICKOFF', ts, minute, data: current, oddsImpact: null });
    } else if ((prevStatus === 'H21' || prevStatus === 'ET2' || prevStatus === 'PE') && curStatus === 'F2') {
      newEvents.push({ id: `ft-${ts}`, type: 'FULLTIME', ts, minute, data: current, oddsImpact: null });
    }
  }

  // VAR Pending
  const curPossibleVar = current.possibleEventSoccer?.VAR;
  const prevPossibleVar = previous?.possibleEventSoccer?.VAR;
  
  if (curPossibleVar && !prevPossibleVar) {
    newEvents.push({ id: `var-pending-${ts}`, type: 'VAR_TRIGGERED', ts, minute, data: current, oddsImpact: null });
  }

  // Only process dataSoccer events if confirmed
  if (current.confirmed && current.dataSoccer) {
    const data = current.dataSoccer;
    const prevData = previous?.dataSoccer || {};

    // 1. VAR Decision
    if (data.VAR && !prevData.VAR) {
      newEvents.push({ id: `var-decision-${ts}`, type: 'VAR_DECISION', ts, minute, data, oddsImpact: null });
    }

    // 2. Goal & Own Goal
    if (data.Goal && !prevData.Goal) {
      const type = data.GoalType === 'OwnGoal' ? 'OWN_GOAL' : 'GOAL';
      newEvents.push({ id: `goal-${ts}`, type, ts, minute, data, oddsImpact: null });
    }

    // 3. Penalty
    if (data.Penalty && !prevData.Penalty) {
      newEvents.push({ id: `penalty-${ts}`, type: 'PENALTY_AWARDED', ts, minute, data, oddsImpact: null });
    }

    // 4. Cards
    if (data.RedCard && !prevData.RedCard) {
      newEvents.push({ id: `red-${ts}`, type: 'RED_CARD', ts, minute, data, oddsImpact: null });
    } else if (data.YellowCard && !prevData.YellowCard) {
      newEvents.push({ id: `yellow-${ts}`, type: 'YELLOW_CARD', ts, minute, data, oddsImpact: null });
    }

    // 5. Substitution
    if (data.PlayerInId && data.PlayerOutId && (!prevData.PlayerInId || !prevData.PlayerOutId)) {
      newEvents.push({ id: `sub-${ts}`, type: 'SUBSTITUTION', ts, minute, data, oddsImpact: null });
    }
  }

  // 6. Direct Action-based Events
  const action = current.Action || current.action;
  const dataPayload = current.Data || current.data || current.dataSoccer || {};

  if (action === 'goal') {
    const type = dataPayload.GoalType === 'OwnGoal' ? 'OWN_GOAL' : 'GOAL';
    newEvents.push({ id: `goal-${ts}`, type, ts, minute, data: dataPayload, oddsImpact: null });
  }

  if (action === 'yellow_card') {
    newEvents.push({ id: `yellow-${ts}`, type: 'YELLOW_CARD', ts, minute, data: dataPayload, oddsImpact: null });
  }

  if (action === 'red_card') {
    newEvents.push({ id: `red-${ts}`, type: 'RED_CARD', ts, minute, data: dataPayload, oddsImpact: null });
  }

  if (action === 'substitution') {
    newEvents.push({ id: `sub-${ts}`, type: 'SUBSTITUTION', ts, minute, data: dataPayload, oddsImpact: null });
  }

  if (action === 'free_kick') {
    if (dataPayload.FreeKickType === 'Offside') {
      newEvents.push({ id: `offside-${ts}`, type: 'OFFSIDE', ts, minute, data: dataPayload, oddsImpact: null });
    } else {
      newEvents.push({ id: `foul-${ts}`, type: 'FOUL', ts, minute, data: dataPayload, oddsImpact: null });
    }
  }

  if (action === 'shot') {
    newEvents.push({ id: `shot-${ts}`, type: 'SHOT', ts, minute, data: dataPayload, oddsImpact: null });
  }

  if (action === 'comment' && dataPayload.Text === 'Water-drinking break') {
    newEvents.push({ id: `hydration-${ts}`, type: 'HYDRATION_BREAK', ts, minute, data: dataPayload, oddsImpact: null });
  }

  if (action === 'var') {
    newEvents.push({ id: `var-triggered-${ts}`, type: 'VAR_TRIGGERED', ts, minute, data: dataPayload, oddsImpact: null });
  }

  if (action === 'var_end') {
    newEvents.push({ id: `var-decision-${ts}`, type: 'VAR_DECISION', ts, minute, data: dataPayload, oddsImpact: null });
  }

  return newEvents;
}
