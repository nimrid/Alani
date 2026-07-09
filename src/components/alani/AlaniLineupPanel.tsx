import React, { useState } from 'react';
import { useLineupStore } from '@/store/matchStore';

export function AlaniLineupPanel() {
  const lineups = useLineupStore((state) => state.lineups);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);

  if (!lineups || lineups.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-text-muted">
        Waiting for lineup data...
      </div>
    );
  }

  // Assuming lineups[0] is home and lineups[1] is away
  const home = lineups[0];
  const away = lineups.length > 1 ? lineups[1] : null;

  const renderTeam = (teamData: any) => {
    if (!teamData) return null;

    // Filter and sort starters vs bench
    const starters = teamData.lineups.filter((p: any) => p.starter).sort((a: any, b: any) => a.rosterNumber - b.rosterNumber);
    const bench = teamData.lineups.filter((p: any) => !p.starter).sort((a: any, b: any) => a.rosterNumber - b.rosterNumber);

    return (
      <div className="flex-1 flex flex-col px-4">
        
        <div className="mb-6">
          <h4 className="text-xs text-text-secondary uppercase tracking-[0.2em] border-b border-border-subtle pb-2 mb-3">
            Starters
          </h4>
          <div className="flex flex-col gap-3">
            {starters.map((p: any) => renderPlayer(p))}
          </div>
        </div>

        <div>
          <h4 className="text-xs text-text-secondary uppercase tracking-[0.2em] border-b border-border-subtle pb-2 mb-3">
            Substitutes
          </h4>
          <div className="flex flex-col gap-3">
            {bench.map((p: any) => renderPlayer(p))}
          </div>
        </div>
      </div>
    );
  };

  const renderPlayer = (p: any) => {
    const isSubbedOut = p.statusId === 'SubstitutedOut';
    const isSubbedIn = p.statusId === 'SubstitutedIn';

    return (
      <div key={p.fixturePlayerId} className="flex items-center text-sm">
        <span className="w-8 text-text-muted font-mono text-xs">{p.rosterNumber}</span>
        <span className="w-8 text-text-secondary font-bold text-xs uppercase">{p.positionId || '—'}</span>
        <span className={`flex-1 truncate ${isSubbedOut ? 'text-text-muted line-through' : isSubbedIn ? 'text-odds-up font-medium' : 'text-text-primary'}`}>
          {isSubbedIn && <span className="mr-1">↑</span>}
          {p.player.preferredName}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-bg-base flex flex-col md:flex-row">
      {/* Mobile Tabs */}
      {away && (
        <div className="flex border-b border-border-subtle shrink-0 md:hidden w-full">
          <button 
            className={`flex-1 py-3 text-sm font-bold tracking-widest uppercase transition-colors ${activeTeamIndex === 0 ? 'text-text-primary border-b-2 border-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            onClick={() => setActiveTeamIndex(0)}
          >
            {home.preferredName}
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-bold tracking-widest uppercase transition-colors ${activeTeamIndex === 1 ? 'text-text-primary border-b-2 border-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            onClick={() => setActiveTeamIndex(1)}
          >
            {away.preferredName}
          </button>
        </div>
      )}
      
      {/* Mobile Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-4 md:hidden">
        {activeTeamIndex === 0 ? renderTeam(home) : renderTeam(away)}
      </div>

      {/* Desktop Content (Side by side) */}
      <div className="hidden md:flex flex-1 overflow-y-auto no-scrollbar w-full">
        <div className="flex-1 border-r border-border-subtle pt-4">
          <h3 className="text-center font-bold tracking-widest uppercase mb-4 text-text-primary">
            {home.preferredName}
          </h3>
          {renderTeam(home)}
        </div>
        {away && (
          <div className="flex-1 pt-4">
            <h3 className="text-center font-bold tracking-widest uppercase mb-4 text-text-primary">
              {away.preferredName}
            </h3>
            {renderTeam(away)}
          </div>
        )}
      </div>
    </div>
  );
}
