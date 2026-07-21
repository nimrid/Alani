import React from 'react';
import { getFlag } from '@/lib/alani/utils';
import { useRouter } from 'next/navigation';

export interface BracketMatch {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
  statusId?: string; // used for live indicator if needed
}

export interface BracketRound {
  title: string;
  matches: BracketMatch[];
}

export function TournamentBracket({ rounds }: { rounds: BracketRound[] }) {
  const router = useRouter();

  return (
    <div className="flex w-full overflow-x-auto overflow-y-hidden pb-8 custom-scrollbar relative z-10">
      <div className="flex gap-12 min-w-max px-4 py-8 min-h-[700px]">
        {rounds.map((round, rIndex) => (
          <div key={rIndex} className="flex flex-col w-64 shrink-0 relative">
            <div className="flex items-center gap-3 mb-8 ml-2">
              <div className="w-2 h-2 rounded-full bg-chain-purple animate-pulse drop-shadow-[0_0_5px_rgba(168,85,247,1)]" />
              <h3 className="text-xs font-black text-text-primary tracking-[0.2em] uppercase">
                {round.title}
              </h3>
            </div>
            
            <div className="flex-1 flex flex-col justify-around relative">
              {round.matches.map((match, mIndex) => {
                const isTop = mIndex % 2 === 0;
                const hasNextRound = rIndex < rounds.length - 1;
                
                const homeWon = match.homeGoals !== null && match.homeGoals > (match.awayGoals ?? 0);
                const awayWon = match.awayGoals !== null && match.awayGoals > (match.homeGoals ?? 0);

                return (
                  <div key={mIndex} className="relative flex items-center my-4 group">
                    {/* Match Card */}
                    <div 
                      onClick={() => match.fixtureId && router.push(`/match/${match.fixtureId}`)}
                      className="w-full bg-bg-surface/60 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden hover:-translate-y-1 hover:border-chain-purple/60 hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] hover:bg-white/10 transition-all duration-300 cursor-pointer relative z-20"
                    >
                      {/* Home Team Row */}
                      <div className={`flex justify-between items-center px-4 py-3 border-b border-white/5 transition-colors relative overflow-hidden ${homeWon ? 'bg-chain-purple/20' : ''}`}>
                        {homeWon && <div className="absolute left-0 top-0 bottom-0 w-1 bg-chain-purple drop-shadow-[0_0_5px_rgba(168,85,247,1)]" />}
                        <div className="flex items-center gap-3 relative z-10">
                          <span className="text-lg drop-shadow-md">{getFlag(match.homeTeam)}</span>
                          <span className={`font-bold text-sm tracking-wide truncate max-w-[110px] ${homeWon ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'text-text-primary'}`}>
                            {match.homeTeam}
                          </span>
                        </div>
                        <span className={`font-black text-sm tabular-nums relative z-10 transition-transform ${homeWon ? 'text-white scale-125 drop-shadow-[0_0_8px_rgba(168,85,247,1)]' : 'text-text-secondary'}`}>
                          {match.homeGoals !== null ? match.homeGoals : '-'}
                        </span>
                      </div>
                      
                      {/* Away Team Row */}
                      <div className={`flex justify-between items-center px-4 py-3 transition-colors relative overflow-hidden ${awayWon ? 'bg-chain-purple/20' : 'bg-black/20'}`}>
                        {awayWon && <div className="absolute left-0 top-0 bottom-0 w-1 bg-chain-purple drop-shadow-[0_0_5px_rgba(168,85,247,1)]" />}
                        <div className="flex items-center gap-3 relative z-10">
                          <span className="text-lg drop-shadow-md">{getFlag(match.awayTeam)}</span>
                          <span className={`font-bold text-sm tracking-wide truncate max-w-[110px] ${awayWon ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'text-text-primary'}`}>
                            {match.awayTeam}
                          </span>
                        </div>
                        <span className={`font-black text-sm tabular-nums relative z-10 transition-transform ${awayWon ? 'text-white scale-125 drop-shadow-[0_0_8px_rgba(168,85,247,1)]' : 'text-text-secondary'}`}>
                          {match.awayGoals !== null ? match.awayGoals : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Connecting Bracket Lines (drawn behind the cards) */}
                    {hasNextRound && (
                      <div 
                        className={`absolute -right-[24px] w-[24px] border-r-2 border-chain-purple/30 group-hover:border-chain-purple/80 group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-300 z-10
                          ${isTop ? 'border-t-2 rounded-tr-lg top-1/2 bottom-[-50%]' : 'border-b-2 rounded-br-lg bottom-1/2 top-[-50%]'}
                        `}
                      />
                    )}
                    {hasNextRound && isTop && (
                       <div className="absolute -right-[48px] top-[100%] w-[24px] border-t-2 border-chain-purple/30 group-hover:border-chain-purple/80 group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-300 z-10" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.7);
        }
      `}</style>
    </div>
  );
}
