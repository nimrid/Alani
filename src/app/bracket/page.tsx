'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { TournamentBracket, BracketRound, BracketMatch } from '@/components/alani/TournamentBracket';

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
}

const ROUND_IDS = {
  ROUND_OF_16: [10115574],
  QUARTER_FINALS: [10115675],
  SEMI_FINALS: [10115573],
  FINAL: [10115572, 10115676], // Devnet uses 10115676
};

export default function BracketPage() {
  const [rounds, setRounds] = useState<BracketRound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch fixtures from the start of the tournament (epoch day 20600 is ~May 2026)
        const res = await fetch('/api/txline/fixtures?startEpochDay=20600');
        if (!res.ok) throw new Error('Failed to fetch fixtures');
        const data: Fixture[] = await res.json();
        
        // 2. Filter by exact FixtureGroupId for knockout rounds
        const knockoutFixtures = data.filter((f: Fixture) => 
          Object.values(ROUND_IDS).flat().includes(f.FixtureGroupId)
        );

        // 3. Helper to fetch scores
        const fetchScore = async (fixtureId: number) => {
          try {
            const scoreRes = await fetch(`/api/txline/scores-snapshot?fixtureId=${fixtureId}`);
            if (!scoreRes.ok) return { homeGoals: null, awayGoals: null };
            const scoreData = await scoreRes.json();
            const withScore = [...(scoreData || [])].filter((d: any) => d.Score).sort((a: any, b: any) => (b.Ts || 0) - (a.Ts || 0));
            const bestScore = withScore[0]?.Score;
            return {
              homeGoals: bestScore?.Participant1?.Total?.Goals ?? 0,
              awayGoals: bestScore?.Participant2?.Total?.Goals ?? 0,
            };
          } catch {
            return { homeGoals: 0, awayGoals: 0 };
          }
        };

        // 4. Map into rounds
        const mapRound = async (title: string, groupIds: number[], padTo: number): Promise<BracketRound> => {
          let matches = knockoutFixtures.filter((f: Fixture) => groupIds.includes(f.FixtureGroupId));
          // Sort by StartTime to keep the bracket somewhat deterministic
          matches.sort((a: any, b: any) => a.StartTime - b.StartTime);

          const bracketMatches: BracketMatch[] = await Promise.all(
            matches.map(async (f: Fixture) => {
              const score = await fetchScore(f.FixtureId);
              // Ensure we display 'TBD' instead of a blank space if a team isn't decided yet
              const homeTeam = f.Participant1 || 'TBD';
              const awayTeam = f.Participant2 || 'TBD';
              return {
                fixtureId: f.FixtureId,
                homeTeam,
                awayTeam,
                homeGoals: homeTeam === 'TBD' ? null : score.homeGoals,
                awayGoals: awayTeam === 'TBD' ? null : score.awayGoals,
              };
            })
          );

          // Pad with empty matches if the API doesn't have them yet to keep the UI shape
          while (bracketMatches.length < padTo) {
            bracketMatches.push({
              fixtureId: 0,
              homeTeam: 'TBD',
              awayTeam: 'TBD',
              homeGoals: null,
              awayGoals: null,
            });
          }

          return { title, matches: bracketMatches };
        };

        const r16 = await mapRound('Round of 16', ROUND_IDS.ROUND_OF_16, 8);
        const qf = await mapRound('Quarterfinals', ROUND_IDS.QUARTER_FINALS, 4);
        const sf = await mapRound('Semifinals', ROUND_IDS.SEMI_FINALS, 2);
        const final = await mapRound('Final', ROUND_IDS.FINAL, 1);

        setRounds([r16, qf, sf, final]);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-bg-base flex flex-col relative overflow-hidden">
      {/* Background Trophy */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.07] mix-blend-screen">
        <img 
          src="/trophy.jpg" 
          alt="World Cup Trophy Background" 
          className="w-[800px] h-[800px] object-cover animate-spin-slow rounded-full"
          style={{ maskImage: 'radial-gradient(circle, black 30%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 70%)' }}
        />
      </div>

      {/* Navbar */}
      <header className="w-full h-16 flex items-center justify-between px-6 border-b border-border-subtle bg-bg-surface/80 backdrop-blur sticky top-0 z-30">
        <Link href="/home" className="group flex items-baseline gap-[2px] cursor-pointer select-none">
          <div className="font-display font-black text-2xl tracking-tighter bg-gradient-to-br from-chain-purple via-[#818CF8] to-[#4F46E5] text-transparent bg-clip-text">
            Alani
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-chain-purple animate-pulse group-hover:scale-150 transition-transform" />
        </Link>
        <div className="flex gap-6 items-center">
          <Link href="/home" className="text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
            Home
          </Link>
          <Link href="/bracket" className="text-sm font-bold text-chain-purple">
            Tournament
          </Link>
        </div>
      </header>

      {/* Main Bracket Content */}
      <main className="flex-1 w-full flex flex-col relative z-10">
        <div className="px-8 py-8 shrink-0">
          <h1 className="text-3xl font-black font-display tracking-tight text-text-primary mb-2">
            Knockout Stages
          </h1>
          <p className="text-sm text-text-secondary">
            World Cup 2026 bracket fueled by live TxLINE data.
          </p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin-slow w-8 h-8 border-2 border-chain-purple border-t-transparent rounded-full" />
          </div>
        ) : (
          <TournamentBracket rounds={rounds} />
        )}
      </main>
    </div>
  );
}
