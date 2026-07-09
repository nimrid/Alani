import { create } from 'zustand';

export type PossessionType = 'SafePossession' | 'AttackPossession' | 'DangerPossession' | 'HighDangerPossession' | 'None';

export interface PossibleEventSoccer {
  Goal?: boolean;
  Penalty?: boolean;
  Corner?: boolean;
}

export interface ScoreData {
  Participant1: { Total: { Goals: number } };
  Participant2: { Total: { Goals: number } };
}

// 1. Possession Store
interface PossessionState {
  possessionType: PossessionType;
  possibleEventSoccer: PossibleEventSoccer;
  setPossession: (type: PossessionType, possibleEvents?: PossibleEventSoccer) => void;
  clear: () => void;
}

export const usePossessionStore = create<PossessionState>((set) => ({
  possessionType: 'None',
  possibleEventSoccer: {},
  setPossession: (type, possibleEvents) => set((state) => ({
    possessionType: type,
    possibleEventSoccer: possibleEvents || state.possibleEventSoccer
  })),
  clear: () => set({ possessionType: 'None', possibleEventSoccer: {} }),
}));

// 2. Score Store
interface ScoreState {
  scoreSoccer: ScoreData;
  statusSoccerId: string;
  minutes: number;
  participant1Id: number | null;
  participant2Id: number | null;
  setScoreData: (data: Partial<Omit<ScoreState, 'setScoreData' | 'clear'>>) => void;
  clear: () => void;
}

export const useScoreStore = create<ScoreState>((set) => ({
  scoreSoccer: {
    Participant1: { Total: { Goals: 0 } },
    Participant2: { Total: { Goals: 0 } },
  },
  statusSoccerId: '',
  minutes: 0,
  participant1Id: null,
  participant2Id: null,
  setScoreData: (data) => set((state) => ({ ...state, ...data })),
  clear: () => set({
    scoreSoccer: {
      Participant1: { Total: { Goals: 0 } },
      Participant2: { Total: { Goals: 0 } },
    },
    statusSoccerId: '',
    minutes: 0,
    participant1Id: null,
    participant2Id: null,
  }),
}));

// 3. Event Store
export type EventType = 'GOAL' | 'OWN_GOAL' | 'RED_CARD' | 'YELLOW_CARD' | 'VAR_TRIGGERED' | 'VAR_DECISION' | 'PENALTY_AWARDED' | 'SUBSTITUTION' | 'KICKOFF' | 'HALFTIME' | 'FULLTIME' | 'FOUL' | 'OFFSIDE' | 'SHOT' | 'HYDRATION_BREAK';

export interface AlaniEvent {
  id: string;
  type: EventType;
  ts: number;
  minute: number;
  data: any;
  narratedText: string;
  narrateStatus: 'pending' | 'streaming' | 'complete' | 'error';
  oddsImpact: {
    homeWinBefore: number;
    homeWinAfter: number;
  } | null;
}

interface EventState {
  events: AlaniEvent[];
  pendingProof: AlaniEvent | null;
  addEvent: (event: AlaniEvent) => void;
  updateEvent: (id: string, updates: Partial<AlaniEvent>) => void;
  setPendingProof: (event: AlaniEvent | null) => void;
  clear: () => void;
}

export const useEventStore = create<EventState>((set) => ({
  events: [],
  pendingProof: null,
  addEvent: (event) => set((state) => {
    const isSignificant = ['GOAL', 'RED_CARD', 'VAR_DECISION', 'PENALTY_AWARDED'].includes(event.type);
    
    return {
      events: [event, ...state.events].slice(0, 50),
      // Automatically prompt for proof on significant events
      pendingProof: isSignificant ? event : state.pendingProof
    };
  }),
  updateEvent: (id, updates) => set((state) => ({
    events: state.events.map(ev => ev.id === id ? { ...ev, ...updates } : ev)
  })),
  setPendingProof: (event) => set({ pendingProof: event }),
  clear: () => set({ events: [], pendingProof: null }),
}));

// 4. Lineup Store
export interface PlayerData {
  id: number;
  normativeId: number;
  country: string;
  team: string;
  dateOfBirth: string;
  gender: string;
  preferredName: string;
}

export interface PlayerLineupData {
  fixturePlayerId: number;
  statusId: string;
  positionId: string;
  unitId: string;
  rosterNumber: number;
  starter: boolean;
  starred: boolean;
  player: PlayerData;
}

export interface LineupData {
  id: number;
  normativeId: number;
  preferredName: string;
  gender: string;
  updateDateMillis: number;
  lineups: PlayerLineupData[];
}

interface LineupState {
  lineups: LineupData[] | null;
  setLineups: (lineups: LineupData[]) => void;
  updateLineupSub: (playerInId: number, playerOutId: number) => void;
  clear: () => void;
}

export const useLineupStore = create<LineupState>((set) => ({
  lineups: null,
  setLineups: (lineups) => set({ lineups }),
  updateLineupSub: (playerInId, playerOutId) => set((state) => {
    if (!state.lineups) return state;

    const newLineups = state.lineups.map(team => {
      const newLineupArr = team.lineups.map(p => {
        if (p.fixturePlayerId === playerInId) {
          return { ...p, statusId: 'SubstitutedIn' };
        }
        if (p.fixturePlayerId === playerOutId) {
          return { ...p, statusId: 'SubstitutedOut' };
        }
        return p;
      });
      return { ...team, lineups: newLineupArr };
    });

    return { lineups: newLineups };
  }),
  clear: () => set({ lineups: null }),
}));

// 5. Audio Store
export type VolumeLevel = 'off' | 'low' | 'medium' | 'high';

interface AudioState {
  volume: VolumeLevel;
  setVolume: (level: VolumeLevel) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  volume: 'low',
  setVolume: (level) => set({ volume: level }),
}));
