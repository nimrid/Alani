import React, { useEffect, useState } from 'react';
import { useOddsStore } from '@/store/oddsStore';
import { useTimelineStore } from '@/store/timelineStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot } from 'recharts';

export function AlaniProbabilityCurve({ fixtureId, isFinished }: { fixtureId?: string, isFinished?: boolean }) {
  const liveHistory = useOddsStore((state) => state.history);
  const setScrubMinute = useTimelineStore(state => state.setScrubMinute);
  const timelineData = useTimelineStore(state => state.timelineData);
  const setTimelineData = useTimelineStore(state => state.setTimelineData);

  const [ready, setReady] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    // Delay rendering chart to allow drawer animation to complete and avoid ResizeObserver loop
    const timer = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isFinished && fixtureId && timelineData.length === 0) {
      setLoadingHistory(true);
      fetch(`/api/txline/match-highlights?fixtureId=${fixtureId}`)
        .then(res => res.json())
        .then(data => {
          if (data.timeline) {
            setTimelineData(data.timeline);
          }
          setLoadingHistory(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingHistory(false);
        });
    }
  }, [isFinished, fixtureId, timelineData.length, setTimelineData]);

  const history = isFinished ? timelineData : liveHistory;

  if (!ready || loadingHistory) {
    return (
      <div className="w-full h-full flex items-center justify-center text-text-muted">
        {loadingHistory ? 'Loading full match timeline...' : 'Waiting for probability data...'}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-text-muted">
        Waiting for probability data...
      </div>
    );
  }

  // Format history for Recharts
  const chartData = history.map((point: any, index: number) => ({
    name: point.minute?.toString() || index.toString(),
    minute: point.minute || index,
    home: point.homeWin,
    draw: point.draw,
    away: point.awayWin,
    events: point.events || [],
  }));

  const handleMouseMove = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      const minute = e.activePayload[0].payload.minute;
      setScrubMinute(minute);
    }
  };

  const handleMouseLeave = () => {
    setScrubMinute(null);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-bg-elevated border border-border-subtle p-3 rounded shadow-lg text-sm font-sans z-50">
          <div className="text-text-muted mb-2 font-display uppercase tracking-widest text-xs border-b border-border-subtle pb-1">
            Minute {data.minute}
          </div>
          <div style={{ color: 'var(--color-odds-up)' }} className="font-bold">Home: {payload[0].value?.toFixed(1)}%</div>
          <div style={{ color: 'var(--color-text-muted)' }} className="font-bold">Draw: {payload[1].value?.toFixed(1)}%</div>
          <div style={{ color: 'var(--color-odds-down)' }} className="font-bold">Away: {payload[2].value?.toFixed(1)}%</div>
          {data.events && data.events.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border-subtle">
              {data.events.map((ev: any, i: number) => (
                <div key={i} className="text-xs font-bold text-white flex items-center gap-1">
                  <span>{ev.type === 'GOAL' ? '⚽' : '🔥'}</span>
                  <span>{ev.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full p-4 bg-bg-surface">
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="font-display font-bold text-sm tracking-widest uppercase text-text-muted">
          {isFinished ? 'Match Timeline (Scrub to view)' : 'Live Probability Curve'}
        </h3>
      </div>
      <div className="w-full h-[250px] relative cursor-crosshair">
        <ResponsiveContainer width="100%" height="100%" debounce={10}>
          <LineChart 
            data={chartData} 
            margin={{ top: 15, right: 5, left: -20, bottom: 5 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
            <XAxis dataKey="name" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
            <Line 
              type="monotone" 
              dataKey="home" 
              stroke="var(--color-odds-up)" 
              strokeWidth={3} 
              dot={false} 
              isAnimationActive={false}
            />
            <Line 
              type="monotone" 
              dataKey="draw" 
              stroke="var(--color-text-muted)" 
              strokeWidth={2} 
              strokeDasharray="5 5" 
              dot={false} 
              isAnimationActive={false}
            />
            <Line 
              type="monotone" 
              dataKey="away" 
              stroke="var(--color-odds-down)" 
              strokeWidth={3} 
              dot={false} 
              isAnimationActive={false}
            />
            {chartData.filter(d => d.events && d.events.length > 0).map((d, i) => (
              <ReferenceDot 
                key={i} 
                x={d.name} 
                y={95} 
                r={10} 
                fill="var(--color-bg-elevated)" 
                stroke="var(--color-border-subtle)"
                label={{ position: 'top', value: '⚽', fill: 'white' }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
