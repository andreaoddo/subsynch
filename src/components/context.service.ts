import { computed, effect, inject, Injectable, model, NgZone, Signal, signal } from '@angular/core';
import { SelectionRange, Subtitle, SubtitleAndId, VideoMode } from './dto';
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
  #waveformLoading = signal<boolean>(false);
  #audioMode = signal<boolean>(false);
  #videoMode = signal<boolean>(false);
  #isPlaying = signal<boolean>(false);
  #isDarkMode = signal<boolean>(false);

  subtitles = this.#subtitles.asReadonly();
  waveform = this.#waveform.asReadonly();
  selectedSubtitleId = this.#selectedSubtitleId.asReadonly();
  subtitleFileName = this.#subtitleFileName.asReadonly();
  videoFileName = this.#videoFileName.asReadonly();
  currentTime = this.#currentTime.asReadonly();
  selectionRange = this.#selectionRange.asReadonly();
  // selectedSubtitle = this.#selectedSubtitle.asReadonly();
  videoUrl = this.#videoUrl.asReadonly();
  waveformLoading = this.#waveformLoading.asReadonly();
  videoMode = this.#videoMode.asReadonly();
  audioMode = this.#audioMode.asReadonly();
  isPlaying = this.#isPlaying.asReadonly();
  isDarkMode = this.#isDarkMode.asReadonly();

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

    effect(() => {
      const htmlElement = document.documentElement;
      let dm = this.#isDarkMode();
      if(dm) {
        htmlElement.classList.add('dark-theme');
      } else {
        htmlElement.classList.remove('dark-theme');
      }
    })
  }

  async load_srt(file: File) {
    this.#subtitleFileName.set(file.name);
    this.#parse_srt(file).then((subtitles) => {
      let subsAndId: SubtitleAndId[] = subtitles
        .sort((a, b) => a.fromTime - b.fromTime)
        .map((s) => {
          return { id: uuid(), subtitle: s };
        });
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

  async load_video_file(file: File) {
    this.#videoFileName.set(file.name);

    this.#waveformLoading.set(true);

    this.#extractWaveform(file).then((res) => {
      this.#waveform.set(res);
      this.#videoMode.set(true);
      this.#audioMode.set(true);

      this.#waveformLoading.set(false);
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
    this.#waveformLoading.set(false);
  }

  addNewSubtitle() {
    let sub = new Subtitle(0, 0, '(empty)');
    if (this.selectionRange()) {
      sub.fromTime = Math.round(this.selectionRange()!.start);
      sub.toTime = Math.round(this.selectionRange()!.end);
    } else {
      sub.fromTime = this.currentTime();
      sub.toTime = this.currentTime() + 3000;
    }

    const id = this.#doAdd(sub);
    this.#selectedSubtitleId.set(id);
  }

  #doAdd(sub: Subtitle): string {
    const subAndId = {id: uuid(), subtitle: sub}
    this.#subtitles.update((subs) => {
      const newSubs = [...subs, subAndId];
      return newSubs.sort((a, b) => a.subtitle.fromTime - b.subtitle.fromTime);
    })
    return subAndId.id
  }

  removeSelectedSubtitle() {
    if (!this.selectedSubtitleId()) return;
    this.#doRemoveById(this.selectedSubtitleId()!);
  }

  #doRemoveById(id: string) {
    this.#subtitles.update((subs) => {
      return subs.filter((sub) => sub.id != id!);
    });

  }

  splitSelectedSubtitle() {
    if (!this.selectedSubtitleId()) return;

    let selected = this.selectedSubtitle()!;
    let midPoint= Math.round((selected.subtitle.fromTime + selected.subtitle.toTime)/2)
    let first = new Subtitle(selected.subtitle.fromTime, midPoint, selected.subtitle.text);
    let second = new Subtitle(midPoint+1, selected.subtitle.toTime, selected.subtitle.text);
    this.removeSelectedSubtitle();
    let id = this.#doAdd(first);
    this.#doAdd(second);
    this.#selectedSubtitleId.set(id);
  }

  mergeSelectedSubtitleWithNext() {
    let selected = this.selectedSubtitle();
    if(!selected) return;
    let index = this.subtitles().findIndex(s => s.id === this.selectedSubtitleId());
    if(index + 1 === this.subtitles().length) return;
    let next = this.subtitles()[index+1]
    this.updateCurrentSubtitle(selected?.subtitle.fromTime, next.subtitle.toTime, selected.subtitle.text + '\n' + next.subtitle.text);
    this.#doRemoveById(next.id);

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
        sub.id === id ? { ...sub, subtitle: new Subtitle( fromTime, toTime, text ) } : sub,
      );
    });
  }

  updateCurrentSubtitle(fromTime: number, toTime: number, text: string) {
    if (!this.selectedSubtitleId()) return;
    this.updateSubtitle(this.selectedSubtitleId()!, fromTime, toTime, text);
  }

  setVideoUrl(videoUrl: SafeUrl) {
    this.#videoUrl.set(videoUrl);
  }

  toggleVideoMode() {
    this.#videoMode.update(mode => !mode);
  }

  toggleAudioMode() {
    this.#audioMode.update(mode => !mode);
  }

  play() {
    this.#isPlaying.set(true);
  }

  pause() {
    this.#isPlaying.set(false);
  }

  toggleDarkMode() {
    this.#isDarkMode.update(v => !v);
  }

  async #extractWaveform(file: File, binMs: number = 10): Promise<number[]> {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 44100,
    });

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // TODO: Find strategy to extract "best" channel?
    const channelData = audioBuffer.getChannelData(0);

    // TODO: Check whether this is correct, might there be drifting if samplesPerBin is rounded too much?
    const samplesPerBin = Math.floor(audioBuffer.sampleRate * (binMs / 1000.0));
    const numBins = Math.floor(channelData.length / samplesPerBin);

    const envelope = new Float32Array(numBins);

    for (let i = 0; i < numBins; i++) {
      let sum = 0;
      const offset = i * samplesPerBin;

      for (let j = 0; j < samplesPerBin; j++) {
        sum += Math.abs(channelData[offset + j]);
      }

      envelope[i] = sum / samplesPerBin;
    }

    audioCtx.close();

    return Array.from(envelope);
  }

  async #parse_srt(file: File): Promise<Subtitle[]> {
    let subs = [];
    const content = await file.text();
    const pattern = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;

    const blocks = content.trim().split(/\r?\n\r?\n/);

    for (const block of blocks) {
      const lines = block.split(/\r?\n/);

      if (lines.length < 3) {
        throw new Error('Invalid format');
      }

      const match = lines[1].match(pattern);
      if (!match) {
        throw new Error(`Invalid SRT timestamp format: '${lines[1]}'`);
      }

      const startMs = this.#toMs(match[1], match[2], match[3], match[4]);
      const endMs = this.#toMs(match[5], match[6], match[7], match[8]);
      const text = lines.slice(2).join('\n');

      subs.push(new Subtitle(startMs, endMs, text ));
    }

    return subs;
  }

  #toMs(h: string, m: string, s: string, ms: string): number {
    return (
      parseInt(h, 10) * 3_600_000 +
      parseInt(m, 10) * 60_000 +
      parseInt(s, 10) * 1_000 +
      parseInt(ms, 10)
    );
  }
}
