export class Subtitle {
  constructor(
    public fromTime: number,
    public toTime: number,
    public text: string,
  ) {}

  get durationMs(): number {
    return this.toTime - this.fromTime;
  }

  get cps(): number {
    const duration = this.durationMs;
    return this.text.length / duration * 1000;
  }

  get speed(): SubtitleSpeed {
    const durationMs = this.durationMs;
    const cps = this.cps;
    if(durationMs < 1000 || cps > 20) return 'TOO_FAST';
    if(cps > 17 && cps <= 20) return 'WARNING_FAST';
    if(cps >= 12 && cps <= 17 && durationMs >= 1500) return 'OPTIMAL';
    if(durationMs >= 1000 && durationMs < 1500 && cps <= 17) return 'WARNING_SLOW'
    else return 'TOO_SLOW'
  }
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

export type SubtitleSpeed = 'TOO_FAST' | 'WARNING_FAST' | 'OPTIMAL' | 'WARNING_SLOW' | 'TOO_SLOW'
