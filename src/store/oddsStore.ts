import { create } from 'zustand';

export interface OddsDataPoint {
  ts: number;
  homeWin: number;
  draw: number;
  awayWin: number;
}

interface OddsState {
  inRunning: boolean;
  history: OddsDataPoint[];
  currentOdds: {
    homeWin: number;
    draw: number;
    awayWin: number;
  } | null;
  updateOdds: (pct: string[], inRunning: boolean) => void;
  clear: () => void;
}

export const useOddsStore = create<OddsState>((set, get) => ({
  inRunning: false,
  history: [],
  currentOdds: null,
  updateOdds: (pct, inRunning) => {
    // Expected pct array: [Home, Draw, Away]
    const homeWin = parseFloat(pct[0]) || 0;
    const draw = parseFloat(pct[1]) || 0;
    const awayWin = parseFloat(pct[2]) || 0;
    
    const now = Date.now();
    const newDataPoint = { ts: now, homeWin, draw, awayWin };

    const state = get();
    const prevOdds = state.currentOdds;

    if (prevOdds) {
      const homeDiff = Math.abs(homeWin - prevOdds.homeWin);
      const drawDiff = Math.abs(draw - prevOdds.draw);
      const awayDiff = Math.abs(awayWin - prevOdds.awayWin);

      if (homeDiff > 5 || drawDiff > 5 || awayDiff > 5) {
        // Trigger significant odds movement event
        console.log('Significant odds movement detected:', { prevOdds, newOdds: newDataPoint });
        // TODO: We will dispatch this to the Event Feed in Stage 3
      }
    }

    set((state) => ({
      inRunning,
      currentOdds: newDataPoint,
      history: [...state.history, newDataPoint].slice(-100), // keep last 100 data points
    }));
  },
  clear: () => set({ inRunning: false, history: [], currentOdds: null }),
}));
