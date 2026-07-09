import React from 'react';

export function SkeletonEventCard() {
  return (
    <div className="w-full p-4 my-2 bg-bg-elevated rounded-[10px] flex flex-col relative overflow-hidden border-l-4 border-border-subtle animate-shimmer">
      <div className="flex items-center justify-between mb-3 opacity-50">
        <div className="w-24 h-4 bg-border-subtle rounded" />
        <div className="w-12 h-6 bg-border-subtle rounded" />
      </div>
      <div className="w-full h-4 bg-border-subtle rounded mb-2 opacity-50" />
      <div className="w-3/4 h-4 bg-border-subtle rounded opacity-50" />
    </div>
  );
}

export function SkeletonMatchCard() {
  return (
    <div className="w-full bg-bg-surface border border-border-subtle rounded-xl p-4 mb-4 animate-shimmer">
      <div className="flex justify-between items-center mb-4 opacity-50">
        <div className="w-32 h-3 bg-border-subtle rounded" />
      </div>
      <div className="flex justify-between items-center mb-4 opacity-50">
        <div className="w-20 h-6 bg-border-subtle rounded" />
        <div className="w-6 h-4 bg-border-subtle rounded" />
        <div className="w-20 h-6 bg-border-subtle rounded" />
      </div>
      <div className="w-full h-2 rounded-full bg-border-subtle overflow-hidden flex opacity-50" />
    </div>
  );
}
