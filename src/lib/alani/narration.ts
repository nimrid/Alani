import { useEventStore, useLineupStore, AlaniEvent } from '@/store/matchStore';

/**
 * Resolves a player's preferred name from the lineup store using their ID.
 * Falls back to a positional description if not found.
 */
function resolvePlayerName(playerId: number | undefined | null): string | null {
  if (!playerId) return null;
  const lineups = useLineupStore.getState().lineups;
  if (!lineups) return null;
  for (const team of lineups) {
    for (const p of team.lineups) {
      // Match by fixturePlayerId or by normativeId
      if (p.fixturePlayerId === playerId || p.player?.id === playerId || p.player?.normativeId === playerId) {
        return p.player?.preferredName || null;
      }
    }
  }
  return null;
}

/**
 * Resolves which team a player belongs to (home or away) by matching against lineup data.
 * The first entry in lineups[] is always the home team (Participant1),
 * the second is always the away team (Participant2).
 */
function resolvePlayerTeam(playerId: number | undefined | null, homeTeamName: string, awayTeamName: string): string | null {
  if (!playerId) return null;
  const lineups = useLineupStore.getState().lineups;
  if (!lineups || lineups.length < 2) return null;
  
  const homeTeam = lineups[0];
  const awayTeam = lineups[1];

  const inHome = homeTeam.lineups.some(
    p => p.fixturePlayerId === playerId || p.player?.id === playerId || p.player?.normativeId === playerId
  );
  if (inHome) return homeTeamName;

  const inAway = awayTeam.lineups.some(
    p => p.fixturePlayerId === playerId || p.player?.id === playerId || p.player?.normativeId === playerId
  );
  if (inAway) return awayTeamName;

  return null;
}

export interface NarrationContext {
  homeTeamName: string;
  awayTeamName: string;
}

export async function triggerNarration(event: AlaniEvent, fixtureId: string, context: NarrationContext) {
  const { updateEvent } = useEventStore.getState();
  updateEvent(event.id, { narrateStatus: 'pending' });

  const { homeTeamName, awayTeamName } = context;

  // Resolve the player involved — try every known ID field in the data payload
  const rawPlayerId =
    event.data?.PlayerId ||
    event.data?.PlayerInId ||
    event.data?.PlayerOutId ||
    event.data?.playerId ||
    null;

  const playerName = resolvePlayerName(rawPlayerId);
  const playerTeam = resolvePlayerTeam(rawPlayerId, homeTeamName, awayTeamName);

  // For substitutions, resolve both players
  let playerInName: string | null = null;
  let playerOutName: string | null = null;
  if (event.type === 'SUBSTITUTION') {
    playerInName = resolvePlayerName(event.data?.PlayerInId);
    playerOutName = resolvePlayerName(event.data?.PlayerOutId);
  }

  try {
    const payload = {
      eventType: event.type,
      minute: event.minute,
      team1Name: homeTeamName,
      team2Name: awayTeamName,
      playerName: playerName || (rawPlayerId ? `#${rawPlayerId}` : null),
      playerTeam: playerTeam,
      playerInName,
      playerOutName,
      goalType: event.data?.GoalType || null,
      varDecision: event.type === 'VAR_DECISION'
        ? (event.data?.Goal ? 'goal awarded' : 'goal disallowed')
        : null,
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
