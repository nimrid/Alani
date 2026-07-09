export interface MatchDramaState {
  homeWinPct: number;
  awayWinPct: number;
  minute: number;
  homeGoals: number;
  awayGoals: number;
  homePossessionDanger: boolean; // Is home in attack/danger
  awayPossessionDanger: boolean; // Is away in attack/danger
  recentSignificantEvent: boolean; // Last 5 mins goal or red card
}

export function computeDramaIndex(match: MatchDramaState): number {
  let score = 0;

  // 1. Close probability = high drama
  const probGap = Math.abs(match.homeWinPct - match.awayWinPct);
  score += Math.max(0, 40 - probGap); // Max 40 pts

  // 2. Late in the match with close score
  const goalDiff = Math.abs(match.homeGoals - match.awayGoals);
  if (match.minute > 70 && goalDiff <= 1) {
    score += 25;
  }

  // 3. Team behind has possession type attack/danger
  const losingTeamHasDanger = 
    (match.homeGoals < match.awayGoals && match.homePossessionDanger) ||
    (match.awayGoals < match.homeGoals && match.awayPossessionDanger) ||
    (goalDiff === 0 && (match.homePossessionDanger || match.awayPossessionDanger)); // If drawn and someone has danger, also adds drama

  if (losingTeamHasDanger) {
    score += 20;
  }

  // 4. Recent significant event (last 5 minutes)
  if (match.recentSignificantEvent) {
    score += 15;
  }

  return Math.min(100, Math.round(score));
}
