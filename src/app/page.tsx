'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/* ─── Animated floating particle ─── */
function Particle({ style }: { style: React.CSSProperties }) {
  return <div className="absolute rounded-full pointer-events-none" style={style} />;
}

/* ─── Inline pitch diagram SVG ─── */
function PitchDiagram() {
  return (
    <svg viewBox="0 0 400 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full opacity-20">
      <rect x="2" y="2" width="396" height="256" rx="4" stroke="#9945FF" strokeWidth="1.5" />
      <line x1="200" y1="2" x2="200" y2="258" stroke="#9945FF" strokeWidth="1" />
      <circle cx="200" cy="130" r="35" stroke="#9945FF" strokeWidth="1" />
      <circle cx="200" cy="130" r="2" fill="#9945FF" />
      {/* Left penalty box */}
      <rect x="2" y="76" width="60" height="108" stroke="#9945FF" strokeWidth="1" />
      <rect x="2" y="100" width="25" height="60" stroke="#9945FF" strokeWidth="1" />
      <circle cx="62" cy="130" r="18" stroke="#9945FF" strokeWidth="1" />
      {/* Right penalty box */}
      <rect x="338" y="76" width="60" height="108" stroke="#9945FF" strokeWidth="1" />
      <rect x="373" y="100" width="25" height="60" stroke="#9945FF" strokeWidth="1" />
      <circle cx="338" cy="130" r="18" stroke="#9945FF" strokeWidth="1" />
    </svg>
  );
}

/* ─── Danger meter mini SVG ─── */
function MiniDangerMeter({ level }: { level: 'safe' | 'attack' | 'danger' | 'hot' }) {
  const colors = {
    safe: '#2D6A8F',
    attack: '#C47D1A',
    danger: '#C43B1A',
    hot: '#FF2D2D',
  };
  const sizes = { safe: 60, attack: 80, danger: 100, hot: 120 };
  const color = colors[level];
  const size = sizes[level];
  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <div
        className="absolute rounded-full opacity-20 animate-ping"
        style={{ width: size, height: size, backgroundColor: color }}
      />
      <div
        className="absolute rounded-full opacity-40"
        style={{ width: size * 0.7, height: size * 0.7, backgroundColor: color }}
      />
      <div
        className="relative rounded-full flex items-center justify-center text-white font-black text-xs"
        style={{ width: 40, height: 40, backgroundColor: color }}
      >
        ⚽
      </div>
    </div>
  );
}

/* ─── Mock live card ─── */
function MockLiveCard() {
  const [homeWin, setHomeWin] = useState(62);
  useEffect(() => {
    const interval = setInterval(() => {
      setHomeWin(prev => {
        const delta = (Math.random() - 0.5) * 4;
        return Math.min(85, Math.max(15, prev + delta));
      });
    }, 1800);
    return () => clearInterval(interval);
  }, []);
  const awayWin = 100 - homeWin - 8;

  return (
    <div className="bg-[#12121A] border border-[#2A2A38] rounded-xl p-4 w-full shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-[#4A4A6A] tracking-widest uppercase font-bold">🏆 FIFA World Cup · LIVE</span>
        <span className="bg-[#FF2D2D] text-white text-[9px] px-2 py-0.5 rounded font-black animate-pulse">HOT</span>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="font-bold text-sm">🇧🇷 Brazil</div>
        <div className="font-black text-xl text-[#FFD700] tracking-tighter">2 – 1</div>
        <div className="font-bold text-sm">🇩🇪 Germany</div>
      </div>
      <div className="flex justify-between text-xs font-bold mb-1">
        <span style={{ color: '#22C55E' }}>{homeWin.toFixed(1)}%</span>
        <span className="text-[#4A4A6A]">Draw 8%</span>
        <span style={{ color: '#EF4444' }}>{awayWin.toFixed(1)}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[#1C1C28] overflow-hidden flex">
        <div className="h-full bg-[#22C55E] transition-all duration-700" style={{ width: `${homeWin}%` }} />
        <div className="h-full bg-[#2A2A38]" style={{ width: '8%' }} />
        <div className="h-full bg-[#EF4444] flex-1" />
      </div>
      <div className="mt-3 text-[10px] text-[#8888A8] flex gap-3">
        <span>⚡ 73' — Yellow card: Müller</span>
      </div>
    </div>
  );
}

/* ─── Particle field ─── */
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  size: Math.random() * 4 + 1,
  opacity: Math.random() * 0.5 + 0.05,
  delay: `${Math.random() * 5}s`,
  duration: `${Math.random() * 6 + 4}s`,
  color: i % 5 === 0 ? '#FFD700' : i % 3 === 0 ? '#FF2D2D' : '#9945FF',
}));

/* ─── Section heading ─── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 mb-4">
      <div className="w-4 h-px bg-[#9945FF]" />
      <span className="text-xs font-black tracking-[0.2em] uppercase text-[#9945FF]">{children}</span>
      <div className="w-4 h-px bg-[#9945FF]" />
    </div>
  );
}

/* ─── Feature card ─── */
function FeatureCard({
  icon, title, desc, accent,
}: { icon: React.ReactNode; title: string; desc: string; accent: string }) {
  return (
    <div
      className="group relative bg-[#12121A] border border-[#2A2A38] rounded-2xl p-6 overflow-hidden hover:border-[#3D3D55] transition-all duration-300 hover:-translate-y-1"
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at 30% 40%, ${accent}12 0%, transparent 70%)` }}
      />
      <div className="relative z-10">
        <div className="text-3xl mb-4">{icon}</div>
        <h3 className="font-black text-base text-[#F0F0F5] mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
          {title}
        </h3>
        <p className="text-sm text-[#8888A8] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* ─── Step ─── */
function HowItWorksStep({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex gap-5 items-start group">
      <div className="shrink-0 w-10 h-10 rounded-full border border-[#9945FF] flex items-center justify-center font-black text-[#9945FF] text-sm group-hover:bg-[#9945FF] group-hover:text-white transition-all duration-300">
        {num}
      </div>
      <div>
        <h4 className="font-bold text-[#F0F0F5] mb-1" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>{title}</h4>
        <p className="text-sm text-[#8888A8] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: '#0A0A0F', color: '#F0F0F5', fontFamily: '"Inter", sans-serif' }}
    >
      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-[#1C1C28]/80 backdrop-blur-xl bg-[#0A0A0F]/60">
        {/* Logo mark */}
        <Link href="/" className="group flex items-baseline gap-[2px] cursor-pointer select-none">
          <div className="font-display font-black text-2xl tracking-tighter bg-gradient-to-br from-[#9945FF] via-[#818CF8] to-[#4F46E5] text-transparent bg-clip-text" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
            Alani
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#9945FF] animate-pulse group-hover:scale-150 transition-transform" />
        </Link>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-xs font-bold uppercase tracking-wider text-[#8888A8] hover:text-[#F0F0F5] transition-colors hidden sm:block">
            Features
          </a>
          <a href="#how-it-works" className="text-xs font-bold uppercase tracking-wider text-[#8888A8] hover:text-[#F0F0F5] transition-colors hidden sm:block">
            How it works
          </a>
          <Link
            href="/home"
            className="relative text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full text-white overflow-hidden group"
            style={{ background: 'linear-gradient(135deg, #9945FF, #7B2FBE)' }}
          >
            <span className="relative z-10">Launch App</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(135deg, #B060FF, #9945FF)' }} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-16 overflow-hidden">
        {/* Particle field */}
        <div className="absolute inset-0 pointer-events-none">
          {PARTICLES.map(p => (
            <Particle
              key={p.id}
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                opacity: p.opacity,
                backgroundColor: p.color,
                animationName: 'floatDot',
                animationDuration: p.duration,
                animationDelay: p.delay,
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-in-out',
              }}
            />
          ))}
        </div>

        {/* Background radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(153,69,255,0.08) 0%, transparent 70%)' }} />

        {/* Hero image — parallax */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ transform: `translateY(${scrollY * 0.25}px)` }}
        >
          <img
            src="/fan-hero.jpg"
            alt="Football fans in stadium"
            className="w-full h-full object-cover object-center"
            style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 20%, rgba(0,0,0,0.6) 50%, #0A0A0F 95%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 20%, rgba(0,0,0,0.6) 50%, #0A0A0F 95%)' }}
          />
        </div>

        {/* Hero content */}
        <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-[#9945FF]/30 bg-[#9945FF]/10">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF2D2D] animate-pulse" />
            <span className="text-xs font-bold text-[#9945FF] tracking-wider uppercase">World Cup 2026 · Live Now</span>
          </div>

          <h1
            className="font-black text-5xl sm:text-7xl leading-[0.95] tracking-tight mb-6"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            Feel Every{' '}
            <span
              className="inline-block"
              style={{
                background: 'linear-gradient(135deg, #FFD700, #FF8C00, #FF2D2D)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Moment
            </span>
            {' '}of the Match
          </h1>

          <p
            className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-10"
            style={{ color: '#C8C8E5', textShadow: '0 2px 16px rgba(0,0,0,1)' }}
          >
            <span className="text-white font-bold">Real-time odds</span>, <span className="text-white font-bold">live danger ratings</span>, AI commentary and <span className="text-white font-bold">on-chain event proofs</span> —
            the stadium experience wherever you are.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/home"
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full font-black text-white text-sm overflow-hidden shadow-[0_0_40px_rgba(153,69,255,0.4)] hover:shadow-[0_0_60px_rgba(153,69,255,0.6)] transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #9945FF, #7B2FBE)' }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'linear-gradient(135deg, #B060FF, #9945FF)' }} />
              <span className="relative z-10">⚽ Enter the App</span>
              <svg className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full font-bold text-sm text-white border border-white/30 hover:border-white/70 hover:bg-white/10 transition-all duration-300"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.3)' }}
            >
              See how it works
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </a>
          </div>

          {/* Scroll cue */}
          <div className="mt-16 flex justify-center">
            <div className="flex flex-col items-center gap-2 text-[#4A4A6A]">
              <svg className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Preview Section ── */}
      <section className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <SectionLabel>Live in action</SectionLabel>
            <h2 className="font-black text-3xl sm:text-5xl" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              The Match, Alive on Your Screen
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left: live card + danger meter */}
            <div className="flex flex-col gap-6">
              <MockLiveCard />
              <div className="bg-[#12121A] border border-[#2A2A38] rounded-xl p-4 flex items-center gap-6">
                <MiniDangerMeter level="hot" />
                <div>
                  <div className="text-xs text-[#4A4A6A] uppercase tracking-widest mb-1 font-bold">Danger Meter</div>
                  <div className="font-black text-[#FF2D2D] text-sm mb-1">High Danger Zone</div>
                  <div className="text-xs text-[#8888A8]">Brazil in the penalty box — shot incoming</div>
                </div>
              </div>
              <div className="bg-[#12121A] border border-[#2A2A38] rounded-xl p-4">
                <div className="text-xs text-[#4A4A6A] uppercase tracking-widest mb-2 font-bold">⚡ AI Commentary</div>
                <p className="text-sm text-[#F0F0F5] leading-relaxed italic">
                  "Brazil are pushing hard through the left flank. Vinicius's pace is causing chaos — Germany desperately need to tighten their defensive shape before the 80th minute."
                </p>
                <div className="mt-2 text-[10px] text-[#9945FF] font-bold">Alani Analyst · 74'</div>
              </div>
            </div>

            {/* Right: pitch + text */}
            <div className="space-y-8">
              <div className="relative rounded-2xl border border-[#2A2A38] overflow-hidden bg-[#0D0D14] p-6">
                <PitchDiagram />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xs text-[#9945FF] uppercase tracking-widest font-bold mb-1">Live Odds</div>
                    <div className="font-black text-2xl text-[#F0F0F5]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>62.4%</div>
                    <div className="text-xs text-[#8888A8]">Brazil win probability</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Odds shift detected', desc: 'Win probability jumped 8% in 3 minutes — something big happened.', icon: '📈' },
                  { label: 'On-chain proof minted', desc: 'Every goal, card and key event is verified on Solana.', icon: '⛓️' },
                  { label: 'Watch party nearby', desc: '3 fan groups watching this match within 2 km of you.', icon: '📍' },
                ].map(item => (
                  <div key={item.label} className="flex gap-3 items-start">
                    <span className="text-xl mt-0.5">{item.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-[#F0F0F5]">{item.label}</div>
                      <div className="text-xs text-[#8888A8]">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(153,69,255,0.05) 0%, transparent 60%)' }}
        />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <SectionLabel>Features</SectionLabel>
            <h2 className="font-black text-3xl sm:text-5xl" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Built for Real Fans
            </h2>
            <p className="text-[#8888A8] mt-4 max-w-lg mx-auto text-sm sm:text-base">
              Not a scores app. Not a highlights reel. Alani reads the game the way you do — with gut, data and context.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon="🔴"
              title="Live Danger Meter"
              desc="A pulsing visual that shows exactly how dangerous a possession is — from safe play to high-danger attacks in real time."
              accent="#FF2D2D"
            />
            <FeatureCard
              icon="📊"
              title="Real-Time Odds"
              desc="Live win probabilities from TxLINE data streams. Watch them shift with every tackle, set piece and chance."
              accent="#22C55E"
            />
            <FeatureCard
              icon="🤖"
              title="AI Match Analyst"
              desc="Claude-powered commentary that reads the unfolding match and gives you the tactical insight of a pundit, live."
              accent="#9945FF"
            />
            <FeatureCard
              icon="⛓️"
              title="On-Chain Event Proofs"
              desc="Every goal, red card and major moment gets minted as a verifiable proof on the Solana blockchain. Immutable match history."
              accent="#9945FF"
            />
            <FeatureCard
              icon="📍"
              title="Watch Party Map"
              desc="Find fans watching the same match near you. Register your pub, home or fan zone and meet your people."
              accent="#C47D1A"
            />
            <FeatureCard
              icon="🔔"
              title="Kickoff Reminders"
              desc="Set a reminder and get notified 15 minutes before any match starts. Never miss a kickoff again."
              accent="#FFD700"
            />
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="font-black text-3xl sm:text-5xl" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              From Kickoff to Full Time
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-10">
              <HowItWorksStep
                num="01"
                title="Open a match"
                desc="Browse live and upcoming fixtures. Every match has real-time odds, possession data and status — all streamed directly from TxLINE."
              />
              <HowItWorksStep
                num="02"
                title="Watch the Danger Meter"
                desc="The pulsing orb in the centre tells you how intense the action is. Red and vibrating? Someone's about to shoot."
              />
              <HowItWorksStep
                num="03"
                title="Read the AI feed"
                desc="As events unfold — goals, cards, VAR calls — the Alani Analyst narrates the action with tactical context you can actually use."
              />
              <HowItWorksStep
                num="04"
                title="Mint the moment"
                desc="Key events are automatically submitted as on-chain proofs to Solana. Your match history, verified forever."
              />
            </div>

            {/* Right: decorated card stack */}
            <div className="relative h-[400px] hidden lg:block">
              {/* Background pitch lines */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden border border-[#2A2A38] bg-[#0D0D14]">
                <PitchDiagram />
              </div>

              {/* Floating event cards */}
              <div className="absolute top-6 right-6 bg-[#12121A] border border-[#2A2A38] rounded-xl p-3 shadow-xl w-52 animate-slide-up" style={{ animationDelay: '0ms' }}>
                <div className="text-[10px] text-[#4A4A6A] uppercase tracking-widest mb-1 font-bold">74' Goal!</div>
                <div className="font-black text-sm text-[#FFD700]">🥅 Vinicius Jr.</div>
                <div className="text-[10px] text-[#8888A8] mt-1">Brazil 2–1 Germany</div>
              </div>

              <div className="absolute bottom-10 left-4 bg-[#12121A] border border-[#9945FF]/40 rounded-xl p-3 shadow-xl w-52" style={{ animation: 'slide-up 0.4s ease-out 200ms both' }}>
                <div className="text-[10px] text-[#9945FF] uppercase tracking-widest mb-1 font-bold">⛓️ Proof minted</div>
                <div className="font-mono text-[9px] text-[#8888A8] truncate">3xKpLm...Df9z</div>
                <div className="text-[10px] text-[#4A4A6A] mt-1">Solana · confirmed</div>
              </div>

              <div className="absolute bottom-28 right-4 bg-[#12121A] border border-[#FF2D2D]/40 rounded-xl p-3 shadow-xl w-44">
                <div className="text-[10px] text-[#FF2D2D] uppercase tracking-widest mb-1 font-bold">High Danger</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF2D2D] animate-pulse" />
                  <span className="text-xs font-bold">Brazil attacking</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Fan culture strip ── */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, rgba(153,69,255,0.08) 0%, rgba(255,45,45,0.06) 50%, rgba(255,215,0,0.04) 100%)'
        }} />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="text-6xl sm:text-8xl mb-6 flex justify-center gap-4 flex-wrap">
            {'🇧🇷🇩🇪🇫🇷🇦🇷🇪🇸🏴󠁧󠁢󠁥󠁮󠁧󠁿🇵🇹🇳🇱'.split(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u).filter(Boolean).map((flag, i) => (
              <span
                key={i}
                className="inline-block hover:scale-125 transition-transform duration-200 cursor-default select-none"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {flag}
              </span>
            ))}
          </div>
          <h2 className="font-black text-3xl sm:text-5xl mb-4" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
            Your Tribe. Your Match.
          </h2>
          <p className="text-[#8888A8] max-w-xl mx-auto mb-10 leading-relaxed">
            Alani is for the fans who don't just watch — they feel every pass, every missed penalty, every VAR delay like a physical event.
            We built this for you.
          </p>
          <Link
            href="/home"
            className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-full font-black text-white text-base overflow-hidden shadow-[0_0_60px_rgba(153,69,255,0.5)] hover:shadow-[0_0_80px_rgba(153,69,255,0.7)] transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, #9945FF, #7B2FBE)' }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(135deg, #B060FF, #9945FF)' }} />
            <span className="relative z-10">⚽ Launch Alani</span>
            <svg className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#1C1C28] py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="group flex items-baseline gap-[2px] select-none">
            <div className="font-display font-black text-xl tracking-tighter bg-gradient-to-br from-[#9945FF] via-[#818CF8] to-[#4F46E5] text-transparent bg-clip-text" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Alani
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#9945FF]" />
          </div>
          <div className="text-xs text-[#4A4A6A] text-center">
            Powered by TxLINE · Solana · Claude AI · Built for World Cup 2026
          </div>
          <Link href="/home" className="text-xs font-bold text-[#9945FF] hover:text-[#B060FF] transition-colors uppercase tracking-wider">
            Open App →
          </Link>
        </div>
      </footer>

      {/* ── Keyframe injection ── */}
      <style jsx global>{`
        @keyframes floatDot {
          0%, 100% { transform: translateY(0px) scale(1); opacity: var(--op, 0.15); }
          50% { transform: translateY(-20px) scale(1.3); opacity: calc(var(--op, 0.15) * 2); }
        }
      `}</style>
    </div>
  );
}
