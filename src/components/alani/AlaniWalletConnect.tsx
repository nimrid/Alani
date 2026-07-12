'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, X, User, LogOut } from 'lucide-react';
import { supabase } from '@/lib/alani/supabase';
import { useRouter } from 'next/navigation';

import { createPortal } from 'react-dom';

export function AlaniWalletConnect() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { connected, publicKey, disconnect } = useWallet();
  const [formScore, setFormScore] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      const address = publicKey.toBase58();
      // Check Supabase for existing profile
      const checkProfile = async () => {
        const { data, error } = await supabase
          .from('fan_profiles')
          .select('form_score')
          .eq('wallet_address', address)
          .single();

        if (error && error.code === 'PGRST116') {
          // New profile, create it
          await supabase.from('fan_profiles').insert({
            wallet_address: address,
            display_name: `Fan_${address.slice(0, 4)}`,
            form_score: 0,
            matches_watched: 0
          });
          setFormScore(0);
        } else if (data) {
          setFormScore(data.form_score || 0);
        }
      };
      
      checkProfile();

      const handleUpdate = () => checkProfile();
      window.addEventListener('alani_form_score_updated', handleUpdate);
      return () => window.removeEventListener('alani_form_score_updated', handleUpdate);
    }
  }, [connected, publicKey]);

  const toggleSheet = () => setIsOpen(!isOpen);

  const modalContent = mounted ? createPortal(
    <div className={`fixed inset-0 z-50 pointer-events-none ${isOpen ? 'pointer-events-auto' : ''}`}>
      {/* Overlay */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Bottom Sheet */}
      <div 
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-bg-surface border-t border-border-subtle rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out flex flex-col pointer-events-auto ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-4 flex justify-between items-center border-b border-border-subtle">
          <h2 className="font-display font-bold text-lg">Your Identity</h2>
          <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-text-primary p-1 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          {!connected ? (
            <>
              <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mb-6">
                <Wallet size={32} className="text-text-primary" />
              </div>
              
              <h3 className="text-center font-display font-bold text-xl mb-2">
                Connect your wallet to own your match moments.
              </h3>
              
              <p className="text-center text-text-secondary mb-8 leading-relaxed max-w-sm">
                Every goal, card, and VAR call you witness gets a verified proof on Solana — permanent, shareable, and yours.
              </p>

              <WalletMultiButton className="!bg-text-primary !text-bg-base !rounded-xl !h-12 !font-bold hover:!opacity-90 transition-opacity w-full max-w-[240px] flex justify-center" />

              <p className="text-center text-xs text-text-muted mt-6 max-w-xs">
                Your wallet address = your identity. <br/> No email. No password. No signup.
              </p>
            </>
          ) : (
            <div className="w-full flex flex-col items-center px-2 pb-2">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-chain-purple/30 blur-2xl rounded-full animate-pulse" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-bg-elevated to-bg-base border border-border-subtle flex items-center justify-center shadow-xl">
                  <User size={40} className="text-chain-purple" />
                </div>
              </div>

              <div className="bg-bg-elevated/80 px-4 py-2 rounded-full border border-border-subtle mb-8 flex items-center gap-3 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-odds-up animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                <span className="font-mono text-sm font-bold tracking-wider text-text-primary">
                  {publicKey?.toBase58().slice(0, 6)}...{publicKey?.toBase58().slice(-4)}
                </span>
              </div>
              
              <div className="w-full bg-gradient-to-b from-bg-elevated to-bg-base rounded-2xl p-6 flex flex-col items-center mb-8 border border-border-subtle shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-chain-purple via-chain-blue to-chain-purple opacity-70 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs text-text-muted uppercase tracking-[0.25em] font-bold mb-2">Form Score</span>
                <span className="font-display font-black text-6xl text-transparent bg-clip-text bg-gradient-to-br from-white to-text-secondary drop-shadow-sm">{formScore}</span>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/profile');
                  }}
                  className="w-full bg-text-primary text-bg-base py-3.5 rounded-xl font-bold hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <User size={18} />
                  View Full Profile
                </button>
                <button 
                  onClick={() => {
                    disconnect();
                    setIsOpen(false);
                  }}
                  className="w-full bg-transparent border border-border-subtle text-text-secondary py-3.5 rounded-xl font-bold hover:bg-card-red/10 hover:text-card-red hover:border-card-red/30 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  Disconnect Wallet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button 
        onClick={toggleSheet}
        className="text-text-secondary hover:text-text-primary relative flex items-center justify-center transition-colors"
      >
        {connected && mounted ? (
          <div className="flex items-center gap-1 bg-bg-elevated px-2 py-1 rounded-full border border-border-subtle hover:border-text-secondary">
            <User size={14} className="text-chain-purple" />
            <span className="text-[10px] font-mono font-bold text-chain-purple">{formScore}</span>
          </div>
        ) : (
          <Wallet size={20} />
        )}
      </button>

      {modalContent}
    </>
  );
}
