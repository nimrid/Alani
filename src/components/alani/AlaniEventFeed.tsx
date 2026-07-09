import React, { useEffect, useRef } from 'react';
import { useEventStore, useScoreStore } from '@/store/matchStore';
import { AlaniEventCard } from './AlaniEventCard';

interface AlaniEventFeedProps {
  homeTeamName: string;
  awayTeamName: string;
  loading?: boolean;
}

import { SkeletonEventCard } from './AlaniSkeleton';

export function AlaniEventFeed({ homeTeamName, awayTeamName, loading = false }: AlaniEventFeedProps) {
  const events = useEventStore((state) => state.events);
  const statusSoccerId = useScoreStore((state) => state.statusSoccerId);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevEventCountRef = useRef(events.length);

  const isFinished = statusSoccerId === 'F2' || String(statusSoccerId) === '4' || String(statusSoccerId) === '8';
  const isPreMatch = !statusSoccerId || statusSoccerId === 'NS2' || String(statusSoccerId) === '0';
  const isActive = !isPreMatch && !isFinished;

  useEffect(() => {
    // Auto-scroll logic: if we are near top, scroll to top on new event
    if (events.length > prevEventCountRef.current) {
      if (scrollRef.current) {
        const { scrollTop } = scrollRef.current;
        if (scrollTop < 100) {
          scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }
    prevEventCountRef.current = events.length;
  }, [events.length]);

  return (
    <div className="w-full flex flex-col h-full overflow-hidden relative">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 w-full bg-bg-base/90 backdrop-blur pb-2 pt-1 border-b border-border-subtle flex items-center justify-between">
        <span className="font-display text-text-primary text-sm tracking-wide">Match Events</span>
        <div className="flex items-center space-x-2">
          {isActive ? (
            <>
              <span className="text-xs text-text-secondary uppercase">Live</span>
              <div className="w-2 h-2 rounded-full bg-high-danger animate-pulse" />
            </>
          ) : (
            <span className="text-xs text-text-muted uppercase">{isFinished ? 'Finished' : 'Upcoming'}</span>
          )}
        </div>
      </div>

      {/* Feed Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar pt-2 pb-24"
      >
        {loading ? (
          <div className="flex flex-col gap-2 w-full px-4 mt-4">
            <SkeletonEventCard />
            <SkeletonEventCard />
            <SkeletonEventCard />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <span className="text-text-primary font-display text-lg mb-2">
              {isPreMatch ? 'Match begins soon' : isFinished ? 'Event history unavailable' : 'Waiting for events...'}
            </span>
            <span className="text-text-muted text-sm px-4">
              {isPreMatch ? `${homeTeamName} vs ${awayTeamName}` : isFinished ? 'Click Watch Replay to view the full match timeline.' : `${homeTeamName} vs ${awayTeamName}`}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((event) => (
              <AlaniEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
