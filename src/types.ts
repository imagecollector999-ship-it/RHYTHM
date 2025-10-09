export interface Note {
  time: number;
}

export interface Section {
  start: number;
  playbackRate: number;
}

export interface Effect {
  time: number;
  type: 'heart' | 'flash' | 'text';
  text?: string;
}

export interface Chart {
  bpm: number;
  sections: Section[];
  notes: Note[];
  effects: Effect[];
}
