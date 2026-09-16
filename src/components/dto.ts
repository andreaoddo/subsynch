export interface Subtitle {
  fromTime: number;
  toTime: number;
  text: string;
}

export interface SubtitleAndId {
  id: string;
  subtitle: Subtitle;
}

export interface SelectionRange {
  start: number;
  end: number;
}

export type VideoMode = 'none' | 'audio' | 'video';
