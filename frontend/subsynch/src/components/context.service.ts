import { computed, effect, inject, Injectable, model, NgZone, Signal, signal } from '@angular/core';
import { SelectionRange, Subtitle, SubtitleAndId } from './dto';
import { v4 as uuid } from 'uuid';
import { SafeUrl } from '@angular/platform-browser';


@Injectable({ providedIn: 'root' })
export class ContextService {
  #zone = inject(NgZone);

  #subtitles = signal<SubtitleAndId[]>([]);
  #waveform = signal<number[]>([]);
  #selectedSubtitleId = signal<string | null>(null);
  #subtitleFileName = signal<string | null>(null);
  #videoFileName = signal<string | null>(null);
  #currentTime = signal<number>(0);
  #selectionRange = signal<{ start: number; end: number } | null>(null);
  #videoUrl = signal<SafeUrl | null>(null);

  subtitles = this.#subtitles.asReadonly();
  waveform = this.#waveform.asReadonly();
  selectedSubtitleId = this.#selectedSubtitleId.asReadonly();
  subtitleFileName = this.#subtitleFileName.asReadonly();
  videoFileName = this.#videoFileName.asReadonly();
  currentTime = this.#currentTime.asReadonly();
  selectionRange = this.#selectionRange.asReadonly();
  // selectedSubtitle = this.#selectedSubtitle.asReadonly();
  videoUrl = this.#videoUrl.asReadonly();

  selectedSubtitle = computed(() => {
    const id = this.selectedSubtitleId();
    if (id === null) return null;
    return this.subtitles().find((s) => s.id === id) ?? null;
  });

  constructor() {
    effect(() => {
      let subs = this.subtitles();
      if (!(window as any).pywebview) {
        // Python API not yet injected, just skip it
        return;
      }
      if (subs) {
        this.#subtitles.update((subtitles) =>
          subtitles.sort((a, b) => a.subtitle.fromTime - b.subtitle.fromTime),
        );
        this.save_srt();
      }
    });
  }

  async load_srt(filename: string) {
    this.#subtitleFileName.set(filename);
    let subs: Subtitle[] = await (window as any).pywebview.api.load_srt(filename);
    let subsAndId: SubtitleAndId[] = subs
      .sort((a, b) => a.fromTime - b.fromTime)
      .map((s) => {
        return { id: uuid(), subtitle: s };
      });
    this.#zone.run(() => {
      this.#subtitles.set(subsAndId);
    });
  }

  async save_srt() {
    // console.log(await (window as any));
    if (this.subtitles().length > 0) {
      await (window as any).pywebview.api.save_srt(
        this.subtitles().map((s) => s.subtitle),
        this.subtitleFileName(),
      );
    }
  }

  async load_video_file(filename: string) {
    this.#videoFileName.set(filename);
    let wf = await (window as any).pywebview.api.load_waveform(filename);
    this.#zone.run(() => {
      this.#waveform.set(wf);
      console.log('Waveform loaded');
    });
  }

  restart() {
    this.#subtitles.set([]);
    this.#waveform.set([]);
    this.#selectedSubtitleId.set(null);
    this.#subtitleFileName.set(null);
    this.#videoFileName.set(null);
    this.#currentTime.set(0);
    this.#selectionRange.set(null);
    this.#videoUrl.set(null);
  }

  addNewSubtitle() {
    let sub: SubtitleAndId = {
      id: uuid(),
      subtitle: {
        fromTime: 0,
        toTime: 0,
        text: '(empty)',
      },
    };
    if (this.selectionRange()) {
      sub.subtitle.fromTime = Math.round(this.selectionRange()!.start);
      sub.subtitle.toTime = Math.round(this.selectionRange()!.end);
    } else {
      sub.subtitle.fromTime = this.currentTime();
      sub.subtitle.toTime = this.currentTime() + 3000;
    }

    this.#subtitles.update((subs) => {
      const newSubs = [...subs, sub];
      return newSubs.sort((a, b) => a.subtitle.fromTime - b.subtitle.fromTime);
    });
    this.#selectedSubtitleId.set(sub.id);
  }

  removeSelectedSubtitle() {
    if (!this.selectedSubtitleId()) return;

    this.#subtitles.update((subs) => {
      return subs.filter((sub) => sub.id != this.selectedSubtitleId()!);
    });
  }

  setCurrentSubtitle(id: string) {
    this.#selectedSubtitleId.set(id);
  }

  setSelectionRange(range: SelectionRange | null) {
    this.#selectionRange.set(range);
  }

  setCurrentTime(currentTime: number) {
    this.#currentTime.set(Math.round(currentTime));
  }

  updateSubtitle(id: string, fromTime: number, toTime: number, text: string) {
    this.#subtitles.update((subs: SubtitleAndId[]) => {
      return subs.map((sub) =>
        sub.id === id ? { ...sub, subtitle: { fromTime, toTime, text } } : sub,
      );
    });
  }

  updateCurrentSubtitle(fromTime: number, toTime: number, text: string) {
    if(!this.selectedSubtitleId()) return;
    this.updateSubtitle(this.selectedSubtitleId()!, fromTime, toTime, text);
  }

  setVideoUrl(videoUrl: SafeUrl) {
    this.#videoUrl.set(videoUrl);
  }
}
