import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AlaniLineupPanel } from './AlaniLineupPanel';
import { AlaniProbabilityCurve } from './AlaniProbabilityCurve';
import { AlaniProbabilityBar } from './AlaniProbabilityBar';

type Tab = 'LINEUPS' | 'PROBABILITY' | null;

interface AlaniDrawerProps {
  homeTeamName: string;
  awayTeamName: string;
  fixtureId: string;
  isFinished: boolean;
}

export function AlaniDrawer({ homeTeamName, awayTeamName, fixtureId, isFinished }: AlaniDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>(null);

  const isOpen = activeTab !== null;

  return (
    <div className="w-full z-30 flex flex-col shrink-0">
      
      {/* Probability Bar (Always visible above the fold, clickable to open PROBABILITY) */}
      <div 
        className="w-full pointer-events-auto cursor-pointer"
        onClick={() => setActiveTab('PROBABILITY')}
      >
        <AlaniProbabilityBar homeTeamName={homeTeamName} awayTeamName={awayTeamName} />
      </div>

      {/* Navigation Bar (The original placeholder bottom nav) */}
      <div className="w-full h-16 border-t border-border-subtle bg-bg-surface/90 backdrop-blur pointer-events-auto flex items-center justify-around px-4">
        <button 
          onClick={() => setActiveTab(activeTab === 'LINEUPS' ? null : 'LINEUPS')}
          className={`text-xs font-bold tracking-widest uppercase transition-colors ${activeTab === 'LINEUPS' ? 'text-text-primary' : 'text-text-secondary'}`}
        >
          Lineups
        </button>
        <button 
          onClick={() => setActiveTab(activeTab === 'PROBABILITY' ? null : 'PROBABILITY')}
          className={`text-xs font-bold tracking-widest uppercase transition-colors ${activeTab === 'PROBABILITY' ? 'text-text-primary' : 'text-text-secondary'}`}
        >
          Odds
        </button>
        <button className="text-xs font-bold tracking-widest uppercase text-text-secondary">
          Wallet
        </button>
      </div>

      {/* The Drawer Content */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-bg-surface border-t border-border-subtle transition-transform duration-300 ease-in-out pointer-events-auto z-40 max-w-md md:max-w-2xl lg:max-w-4xl mx-auto rounded-t-xl`}
        style={{ 
          height: '60vh', 
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)' 
        }}
      >
        <div className="w-full h-12 border-b border-border-subtle flex items-center justify-between px-4 bg-bg-base">
          <span className="font-display font-bold text-text-primary tracking-widest uppercase">
            {activeTab}
          </span>
          <button onClick={() => setActiveTab(null)} className="p-2 text-text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        </div>
        
        <div className="w-full h-[calc(100%-3rem)] overflow-hidden">
          {activeTab === 'LINEUPS' && <AlaniLineupPanel />}
          {activeTab === 'PROBABILITY' && <AlaniProbabilityCurve fixtureId={fixtureId} isFinished={isFinished} />}
        </div>
      </div>

      {/* Backdrop overlay for mobile when drawer is open */}
      {isOpen && (
        <div 
          className="absolute inset-0 bg-black/50 z-30 pointer-events-auto transition-opacity"
          onClick={() => setActiveTab(null)}
        />
      )}
    </div>
  );
}
