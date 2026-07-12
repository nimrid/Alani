import React, { useState } from 'react';
import { AlaniEvent, useEventStore, useLineupStore } from '@/store/matchStore';
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { generateEventProof } from '@/lib/alani/proofGenerator';

interface AlaniEventCardProps {
  event: AlaniEvent;
}

/** Resolve a player ID to their preferred name via the lineup store */
function resolvePlayerName(playerId: number | undefined | null): string {
  if (!playerId) return '?';
  const lineups = useLineupStore.getState().lineups;
  if (!lineups) return `#${playerId}`;
  for (const team of lineups) {
    for (const p of (team.lineups || [])) {
      // fixturePlayerId or player.normativeId both work
      if (
        p.fixturePlayerId === playerId ||
        p.player?.normativeId === playerId ||
        Number(p.player?.normativeId) === playerId
      ) {
        return p.player?.preferredName || `#${playerId}`;
      }
    }
  }
  return `#${playerId}`;
}

/** Extract the score at the time of an event from event data */
function extractEventScore(data: any): string {
  // Try rich Score object first (TxLINE format)
  const score = data?.Score || data?.score;
  const stats = data?.stats || data?.Stats;

  const homeG = score?.Participant1?.Total?.Goals ?? stats?.['2'] ?? null;
  const awayG = score?.Participant2?.Total?.Goals ?? stats?.['1002'] ?? null;

  if (homeG !== null && awayG !== null) return `${homeG} – ${awayG}`;
  return '';
}

export function AlaniEventCard({ event }: AlaniEventCardProps) {
  const { type, minute, narratedText, narrateStatus, oddsImpact, data } = event;
  const { connected } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  // ── Phase markers (Kickoff / HT / FT) ────────────────────────────────────
  if (['KICKOFF', 'HALFTIME', 'FULLTIME'].includes(type)) {
    const label =
      type === 'HALFTIME' ? 'Half Time' :
      type === 'FULLTIME' ? 'Full Time' : 'Kick Off';
    const scoreStr = extractEventScore(data);
    return (
      <div className="w-full py-4 my-2 flex flex-col items-center justify-center bg-bg-surface border-y border-border-subtle animate-slide-up">
        <span className="font-display text-text-muted text-lg tracking-widest uppercase">
          {label} {scoreStr && `· ${scoreStr}`}
        </span>
      </div>
    );
  }

  // ── Substitution ──────────────────────────────────────────────────────────
  if (type === 'SUBSTITUTION') {
    const playerOut = resolvePlayerName(data?.PlayerOutId);
    const playerIn  = resolvePlayerName(data?.PlayerInId);
    const teamLabel = data?.participant === 1 ? 'Home' : data?.participant === 2 ? 'Away' : '';
    return (
      <div className="w-full p-3 my-2 bg-bg-elevated rounded-[10px] flex items-center justify-between animate-slide-up">
        <div className="flex items-center space-x-3">
          <span className="text-text-muted text-xs font-mono w-8 text-right shrink-0">{minute}'</span>
          <div className="flex flex-col text-sm">
            <span className="text-text-muted line-through">{playerOut}</span>
            <span className="text-text-primary"><span className="text-odds-up">↑</span> {playerIn}</span>
          </div>
        </div>
        {teamLabel && (
          <span className="text-[10px] text-text-muted uppercase tracking-wider">{teamLabel}</span>
        )}
      </div>
    );
  }

  // ── Event card styling ────────────────────────────────────────────────────
  let accentColor = '';
  let icon = '';
  let label = '';
  let borderStyle = 'solid';
  let isPending = false;

  switch (type) {
    case 'GOAL':
    case 'OWN_GOAL':
      accentColor = 'var(--color-goal)';
      icon = '⚽';
      label = type === 'OWN_GOAL' ? 'OWN GOAL' : 'GOAL';
      break;
    case 'RED_CARD':
      accentColor = 'var(--color-card-red)';
      icon = '🟥';
      label = 'RED CARD';
      break;
    case 'YELLOW_CARD':
      accentColor = 'var(--color-card-yellow)';
      icon = '🟨';
      label = 'YELLOW CARD';
      break;
    case 'VAR_TRIGGERED':
      accentColor = 'var(--color-var)';
      icon = '📺';
      label = 'VAR CHECK';
      borderStyle = 'dashed';
      isPending = true;
      break;
    case 'VAR_DECISION': {
      const overturned = data?.Outcome === 'Overturned' || data?.outcome === 'Overturned';
      accentColor = overturned ? 'var(--color-card-red)' : 'var(--color-var)';
      icon = overturned ? '❌' : '✅';
      label = overturned ? 'VAR OVERTURNED' : 'VAR UPHELD';
      break;
    }
    case 'PENALTY_AWARDED':
      accentColor = 'var(--color-goal)';
      icon = '🎯';
      label = 'PENALTY';
      break;
    case 'FOUL':
      accentColor = 'var(--color-border-active)';
      icon = '🛡️';
      label = 'FOUL';
      break;
    case 'OFFSIDE':
      accentColor = 'var(--color-border-active)';
      icon = '🚩';
      label = 'OFFSIDE';
      break;
    case 'SHOT':
      accentColor = 'var(--color-border-active)';
      icon = '🥅';
      label = 'SHOT';
      break;
    case 'HYDRATION_BREAK':
      accentColor = 'var(--color-border-active)';
      icon = '💧';
      label = 'HYDRATION BREAK';
      break;
    default:
      accentColor = 'var(--color-border-active)';
      icon = '⚡';
      label = 'EVENT';
  }

  // Score at the moment this event happened
  const scoreStr = extractEventScore(data);

  return (
    <div
      className="w-full p-4 my-2 bg-bg-elevated rounded-[10px] flex flex-col relative overflow-hidden animate-slide-up"
      style={{ borderLeft: `3px ${borderStyle} ${accentColor}` }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2 text-xs font-bold tracking-[0.1em] uppercase" style={{ color: accentColor }}>
          <span>{icon}</span>
          <span>{label}</span>
          <span className="text-text-muted font-mono tracking-normal">· {minute}'</span>
        </div>
        {scoreStr && (
          <div className="font-display text-lg text-text-primary tabular-nums">
            {scoreStr}
          </div>
        )}
      </div>

      {/* Narration body */}
      <div className="text-base text-text-primary font-sans leading-relaxed min-h-[40px]">
        {isPending ? (
          <span className="animate-pulse text-text-secondary">Review underway...</span>
        ) : (
          <span>
            {narratedText || 'Analyzing event...'}
            {narrateStatus === 'streaming' && (
              <span className="inline-block w-1 h-4 ml-1 bg-text-primary animate-pulse align-middle" />
            )}
          </span>
        )}
      </div>

      {/* Footer */}
      {!isPending && (
        <div className="mt-4 pt-3 border-t border-border-subtle flex flex-col gap-3">
          <div className="flex items-center justify-between">
            {oddsImpact ? (
              <div className="flex items-center space-x-2 text-sm">
                <span>📈 Impact:</span>
                <span className={oddsImpact.homeWinAfter >= oddsImpact.homeWinBefore ? 'text-odds-up' : 'text-odds-down'}>
                  {oddsImpact.homeWinAfter >= oddsImpact.homeWinBefore ? '+' : ''}
                  {(oddsImpact.homeWinAfter - oddsImpact.homeWinBefore).toFixed(1)}%
                </span>
              </div>
            ) : narrateStatus === 'complete' ? (
              <div />
            ) : (
              <div className="flex items-center space-x-2 text-sm">
                <span>📈 Impact:</span>
                <span className="text-text-muted">Analyzing...</span>
              </div>
            )}

            {narrateStatus === 'complete' && (
              <div className="flex items-center space-x-1 text-xs" style={{ color: 'var(--color-chain)' }}>
                <span>[ verified ✓ ]</span>
              </div>
            )}
          </div>

          {/* On-chain verification prompt */}
          {useEventStore(state => state.pendingProof?.id) === event.id && (
            <div className="w-full mt-2 bg-chain-purple/10 border border-chain-purple/30 rounded-xl p-4 animate-in slide-in-from-bottom-2 duration-300 relative overflow-hidden">
              <div
                className="absolute top-0 right-0 p-2 text-chain-purple/50 hover:text-chain-purple cursor-pointer"
                onClick={() => useEventStore.getState().setPendingProof(null)}
              >
                ✕
              </div>
              <h4 className="text-chain-purple font-display font-bold mb-1 text-sm flex items-center gap-2">
                ⚡ Own This Moment
              </h4>
              <p className="text-xs text-text-secondary mb-3 pr-4">
                You were here for this. Verify it on Solana to add it to your Fan Profile and boost your Form Score.
              </p>
              <button
                className={`w-full text-white rounded-lg py-2 text-xs font-bold transition-colors ${
                  connected
                    ? 'bg-chain-purple hover:bg-chain-purple/80'
                    : 'bg-bg-elevated text-text-muted hover:bg-bg-surface cursor-not-allowed border border-border-subtle'
                }`}
                disabled={!connected || isGeneratingProof}
                onClick={async () => {
                  if (!connected || !anchorWallet) return;
                  setIsGeneratingProof(true);
                  try {
                    const fixtureId = Number(window.location.pathname.split('/').pop());
                    const txId = await generateEventProof(anchorWallet, fixtureId, event.type, event.ts, event.minute);
                    useEventStore.getState().setPendingProof(null);
                    alert(`Verified successfully! TX: ${txId}`);
                  } catch (err: any) {
                    alert('Verification failed: ' + err.message);
                  } finally {
                    setIsGeneratingProof(false);
                  }
                }}
              >
                {isGeneratingProof ? 'Generating Proof...' : connected ? 'Sign & Verify on Solana' : 'Connect Wallet to Verify'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
