import { NextRequest, NextResponse } from 'next/server';
import { getGuestJWT, buildTxLineHeaders, TXLINE_CONFIG } from '@/lib/txline/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get('fixtureId');

  if (!fixtureId) {
    return NextResponse.json({ error: 'Missing fixtureId' }, { status: 400 });
  }

  try {
    const jwt = process.env.TXLINE_DEV_JWT || await getGuestJWT();
    const apiToken = process.env.TXLINE_DEV_API_TOKEN || 'mock-api-token';
    const txLineHeaders = buildTxLineHeaders(jwt, apiToken);
    
    const upstreamScoresUrl = `${TXLINE_CONFIG.apiBase}/scores/snapshot/${fixtureId}`;
    const upstreamOddsUrl = `${TXLINE_CONFIG.apiBase}/odds/snapshot/${fixtureId}`;
    
    const [scoresRes, oddsRes] = await Promise.all([
      fetch(upstreamScoresUrl, { headers: txLineHeaders }),
      fetch(upstreamOddsUrl, { headers: txLineHeaders })
    ]);

    let scoresData: any[] = [];
    if (scoresRes.ok) {
      scoresData = await scoresRes.json();
    }
    
    let oddsData: any[] = [];
    if (oddsRes.ok) {
      oddsData = await oddsRes.json();
    }

    // Process the timeline
    // We want to return an array of TimelinePoint (one per minute)
    const timelineMap = new Map<number, any>();

    let lastHomeScore = 0;
    let lastAwayScore = 0;
    let lastPossessionType = '';

    for (const event of scoresData) {
      let minute = null;
      if (event.Clock?.Seconds) {
        minute = Math.floor(event.Clock.Seconds / 60);
      } else if (event.Data?.Minutes !== undefined) {
        minute = event.Data.Minutes;
      } else if (event.DataSoccer?.Minutes !== undefined) {
        minute = event.DataSoccer.Minutes;
      }

      if (minute !== null && minute >= 0 && minute <= 130) {
        const homeScore = event.Score?.Participant1?.Total?.Goals || event.scoreSoccer?.Participant1 || lastHomeScore;
        const awayScore = event.Score?.Participant2?.Total?.Goals || event.scoreSoccer?.Participant2 || lastAwayScore;
        const possessionType = event.PossessionType || event.possessionType || lastPossessionType;

        lastHomeScore = homeScore;
        lastAwayScore = awayScore;
        lastPossessionType = possessionType;

        let eventsAtMinute: any[] = timelineMap.get(minute)?.events || [];

        // Check for goals or red cards in this event payload to add as markers
        // Since snapshot often accumulates stats, we should only add the event when the count increments
        // This is a simplified mock to extract some events from the stream action
        
        timelineMap.set(minute, {
          minute,
          homeScore,
          awayScore,
          possessionType,
          events: eventsAtMinute
        });
      }
    }

    // Convert map to array and fill in the blanks
    const maxMinute = Math.max(...Array.from(timelineMap.keys()), 90);
    const timeline: any[] = [];
    let currentHomeScore = 0;
    let currentAwayScore = 0;

    for (let m = 0; m <= maxMinute; m++) {
      if (timelineMap.has(m)) {
        const pt = timelineMap.get(m);
        currentHomeScore = pt.homeScore;
        currentAwayScore = pt.awayScore;
        timeline.push({ ...pt });
      } else {
        timeline.push({
          minute: m,
          homeScore: currentHomeScore,
          awayScore: currentAwayScore,
          events: []
        });
      }
    }

    // Merge or mock Odds Data
    // If odds data is empty (as it is in devnet for some fixtures), we simulate a curve based on score
    if (oddsData.length === 0) {
      for (const pt of timeline) {
        const m = pt.minute;
        let homeProb = 38;
        let drawProb = 30;
        let awayProb = 32;

        const scoreDiff = pt.homeScore - pt.awayScore;
        
        // Very rudimentary probability simulation
        if (scoreDiff > 0) {
          homeProb += (scoreDiff * 15) + (m * 0.4);
          drawProb -= (scoreDiff * 5) + (m * 0.2);
          awayProb -= (scoreDiff * 10) + (m * 0.2);
        } else if (scoreDiff < 0) {
          awayProb += (Math.abs(scoreDiff) * 15) + (m * 0.4);
          drawProb -= (Math.abs(scoreDiff) * 5) + (m * 0.2);
          homeProb -= (Math.abs(scoreDiff) * 10) + (m * 0.2);
        } else {
          drawProb += (m * 0.5);
          homeProb -= (m * 0.25);
          awayProb -= (m * 0.25);
        }

        // Clamp values
        const clamp = (val: number) => Math.max(1, Math.min(99, val));
        homeProb = clamp(homeProb);
        drawProb = clamp(drawProb);
        awayProb = clamp(awayProb);

        // Normalize
        const total = homeProb + drawProb + awayProb;
        pt.homeWin = (homeProb / total) * 100;
        pt.draw = (drawProb / total) * 100;
        pt.awayWin = (awayProb / total) * 100;
      }
    } else {
      // Map real odds to minutes
      // (Simplified: if real odds are present, we should bucket them similarly)
    }

    // Mock some events if there are goals to make the timeline look good
    let prevH = 0;
    let prevA = 0;
    for (const pt of timeline) {
      if (pt.homeScore > prevH) {
        pt.events.push({ type: 'GOAL', text: 'Goal', team: 'home' });
        prevH = pt.homeScore;
      }
      if (pt.awayScore > prevA) {
        pt.events.push({ type: 'GOAL', text: 'Goal', team: 'away' });
        prevA = pt.awayScore;
      }
    }

    return NextResponse.json({ timeline });
  } catch (error) {
    console.error('Match highlights error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
