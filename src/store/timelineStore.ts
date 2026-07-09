import { create } from 'zustand';

export interface TimelinePoint {
  minute: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  homeScore?: string | null;
  awayScore?: string | null;
  events?: {
    type: string;
    text: string;
    team: 'home' | 'away';
  }[];
}

interface TimelineState {
  scrubMinute: number | null;
  timelineData: TimelinePoint[];
  setScrubMinute: (minute: number | null) => void;
  setTimelineData: (data: TimelinePoint[]) => void;
  clear: () => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  scrubMinute: null,
  timelineData: [],
  setScrubMinute: (minute) => set({ scrubMinute: minute }),
  setTimelineData: (data) => set({ timelineData: data }),
  clear: () => set({ scrubMinute: null, timelineData: [] }),
}));
