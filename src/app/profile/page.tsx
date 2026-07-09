'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/alani/supabase';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Calendar, Trophy, ArrowLeft } from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function ProfilePage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  
  const [profile, setProfile] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!connected || !publicKey) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      const address = publicKey.toBase58();
      
      const [profileRes, eventsRes] = await Promise.all([
        supabase.from('fan_profiles').select('*').eq('wallet_address', address).single(),
        supabase.from('fan_events').select('*').eq('wallet_address', address).order('event_ts', { ascending: false })
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      
      setIsLoading(false);
    };

    loadData();
  }, [connected, publicKey]);

  if (!connected) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6">
        <h1 className="font-display font-black text-3xl mb-4">Profile</h1>
        <p className="text-text-secondary mb-8 text-center max-w-sm">Connect your wallet to view your identity and verified match moments.</p>
        <WalletMultiButton className="!bg-text-primary !text-bg-base !rounded-xl !font-bold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col text-text-primary">
      {/* Header */}
      <header className="h-[72px] flex items-center px-4 border-b border-border-subtle bg-bg-surface sticky top-0 z-10">
        <button onClick={() => router.push('/')} className="p-2 hover:bg-bg-elevated rounded-full transition-colors mr-2">
          <ArrowLeft size={20} className="text-text-secondary" />
        </button>
        <h1 className="font-display font-bold text-xl flex-1">Fan Profile</h1>
        <WalletMultiButton className="!bg-transparent !border !border-border-subtle !text-text-primary !rounded-xl !h-[36px] !px-4 !text-sm !font-bold" />
      </header>

      {isLoading ? (
        <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-chain-purple border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <main className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
          {/* Identity Card */}
          <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-chain-purple to-high-danger flex items-center justify-center mb-4 relative shadow-[0_0_30px_rgba(157,78,221,0.2)]">
              <ShieldCheck size={40} className="text-white" />
              <div className="absolute -bottom-2 -right-2 bg-bg-base rounded-full p-1 border-2 border-border-subtle">
                <div className="w-6 h-6 bg-chain-purple rounded-full flex items-center justify-center text-[10px] font-bold text-white">WC</div>
              </div>
            </div>
            
            <h2 className="font-display font-black text-2xl mb-1">{profile?.display_name || 'Anonymous Fan'}</h2>
            <div className="text-sm font-mono text-text-muted mb-6 bg-bg-elevated px-3 py-1 rounded-full">
              {publicKey?.toBase58().slice(0, 6)}...{publicKey?.toBase58().slice(-6)}
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="bg-bg-elevated rounded-xl p-4 flex flex-col items-center border border-border-subtle">
                <span className="text-xs text-text-muted uppercase tracking-widest font-bold mb-1">Form Score</span>
                <span className="font-display font-black text-4xl text-chain-purple">{profile?.form_score || 0}</span>
              </div>
              <div className="bg-bg-elevated rounded-xl p-4 flex flex-col items-center border border-border-subtle">
                <span className="text-xs text-text-muted uppercase tracking-widest font-bold mb-1">Matches</span>
                <span className="font-display font-black text-4xl text-text-primary">{profile?.matches_watched || 0}</span>
              </div>
            </div>
          </div>

          {/* Verified Timeline */}
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-chain-purple" />
            Verified Moments
          </h3>

          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="bg-bg-surface border border-border-subtle rounded-xl p-8 text-center text-text-secondary flex flex-col items-center">
                <Calendar size={32} className="mb-3 opacity-50" />
                <p>No verified moments yet.</p>
                <p className="text-sm text-text-muted mt-1">Watch live matches to collect on-chain proofs of significant events.</p>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="bg-bg-surface border border-border-subtle rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-text-primary">{event.event_type}</span>
                      <span className="text-xs font-mono bg-bg-elevated text-text-secondary px-1.5 py-0.5 rounded">{event.event_minute}'</span>
                    </div>
                    <div className="text-sm text-text-muted">Fixture #{event.fixture_id}</div>
                  </div>
                  
                  {event.verified ? (
                    <a 
                      href={`https://explorer.solana.com/tx/${event.on_chain_tx}?cluster=devnet`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs font-bold text-chain-purple hover:text-white transition-colors bg-chain-purple/10 px-3 py-1.5 rounded-full border border-chain-purple/30"
                    >
                      <ShieldCheck size={14} />
                      VERIFIED
                    </a>
                  ) : (
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Pending</span>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      )}
    </div>
  );
}
