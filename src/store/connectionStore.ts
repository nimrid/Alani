import { create } from 'zustand';

interface ConnectionStore {
  scoresConnected: boolean;
  oddsConnected: boolean;
  lastScoresEventId: string | null;
  lastOddsEventId: string | null;
  setScoresConnected: (v: boolean) => void;
  setOddsConnected: (v: boolean) => void;
  setLastScoresEventId: (id: string) => void;
  setLastOddsEventId: (id: string) => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  scoresConnected: false,
  oddsConnected: false,
  lastScoresEventId: null,
  lastOddsEventId: null,
  setScoresConnected: (scoresConnected) => set({ scoresConnected }),
  setOddsConnected: (oddsConnected) => set({ oddsConnected }),
  setLastScoresEventId: (lastScoresEventId) => set({ lastScoresEventId }),
  setLastOddsEventId: (lastOddsEventId) => set({ lastOddsEventId }),
}));
