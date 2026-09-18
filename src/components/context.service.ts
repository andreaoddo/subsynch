import { computed, effect, inject, Injectable, model, NgZone, Signal, signal } from '@angular/core';
import { SelectionRange, ShiftMode, Subtitle, SubtitleAndId, VideoMode } from './dto';
import { v4 as uuid } from 'uuid';
import { SafeUrl } from '@angular/platform-browser';
import { FormatMsPipe } from './formatms.pipe';


@Injectable({ providedIn: 'root' })
export class ContextService {
  #formatMs = inject(FormatMsPipe);

  #subtitles = signal<SubtitleAndId[]>([]);
  #waveform = signal<number[]>([]);
  #selectedSubtitleId = signal<string | null>(null);
  #subtitleFile = signal<File | null>(null);
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
  #shiftMode = signal<ShiftMode>('THIS');
  #isInitialLoad = false;
  #hasPendingChanges = signal<boolean>(false);
  #playForever = signal<boolean>(false);

  subtitles = this.#subtitles.asReadonly();
  waveform = this.#waveform.asReadonly();
  selectedSubtitleId = this.#selectedSubtitleId.asReadonly();
  subtitleFileName = computed(() => this.#subtitleFile.name);
  videoFileName = this.#videoFileName.asReadonly();
  currentTime = this.#currentTime.asReadonly();
  selectionRange = this.#selectionRange.asReadonly();
  videoUrl = this.#videoUrl.asReadonly();
  waveformLoading = this.#waveformLoading.asReadonly();
  videoMode = this.#videoMode.asReadonly();
  audioMode = this.#audioMode.asReadonly();
  isPlaying = this.#isPlaying.asReadonly();
  isDarkMode = this.#isDarkMode.asReadonly();
  shiftMode = this.#shiftMode.asReadonly();
  hasPendingChanges = this.#hasPendingChanges.asReadonly();
  playForever = this.#playForever.asReadonly();

  selectedSubtitle = computed(() => {
    const id = this.selectedSubtitleId();
    if (id === null) return null;
    return this.subtitles().find((s) => s.id === id) ?? null;
  });

  playbackBoundary = computed(() => {
    if (this.selectedSubtitle()) {
      return {
        start: this.selectedSubtitle()!.subtitle.fromTime,
        end: this.selectedSubtitle()!.subtitle.toTime,
      };
    } else if (this.selectionRange()) {
      return {
        start: this.selectionRange()!.start,
        end: this.selectionRange()!.end,
      };
    }
    return null;
  });

  constructor() {
    setInterval(() => {
      if (this.#hasPendingChanges()) {
        this.saveToLocalStorage();
      }
    }, 300000); // 300,000 ms = 5 minutes

    effect(() => {
      let subs = this.subtitles();
      if (subs && subs.length > 0) {
        this.#subtitles.update((subtitles) =>
          subtitles.sort((a, b) => a.subtitle.fromTime - b.subtitle.fromTime),
        );

        // If it's an initial load, skip flagging it and reset the variable
        if (this.#isInitialLoad) {
          this.#isInitialLoad = false;
        } else {
          this.#hasPendingChanges.set(true);
        }
      }
    });

    effect(() => {
      const htmlElement = document.documentElement;
      let dm = this.#isDarkMode();
      if (dm) {
        htmlElement.classList.add('dark-theme');
      } else {
        htmlElement.classList.remove('dark-theme');
      }
    });
  }

  async load_srt(file: File) {
    this.#parse_srt(file).then((subtitles) => {
      let subsAndId: SubtitleAndId[] = subtitles
        .sort((a, b) => a.fromTime - b.fromTime)
        .map((s) => {
          return { id: uuid(), subtitle: s };
        });

      // Tell the effect to ignore this specific update
      this.#isInitialLoad = true;

      this.#subtitles.set(subsAndId);
      this.#hasPendingChanges.set(false); // Ensure badge is hidden
    });
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
    this.#subtitleFile.set(null);
    this.#videoFileName.set(null);
    this.#currentTime.set(0);
    this.#selectionRange.set(null);
    this.#videoUrl.set(null);
    this.#waveformLoading.set(false);
    this.#hasPendingChanges.set(false);
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
    const subAndId = { id: uuid(), subtitle: sub };
    this.#subtitles.update((subs) => {
      const newSubs = [...subs, subAndId];
      return newSubs.sort((a, b) => a.subtitle.fromTime - b.subtitle.fromTime);
    });
    return subAndId.id;
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
    let midPoint = Math.round((selected.subtitle.fromTime + selected.subtitle.toTime) / 2);
    let first = new Subtitle(selected.subtitle.fromTime, midPoint, selected.subtitle.text);
    let second = new Subtitle(midPoint + 1, selected.subtitle.toTime, selected.subtitle.text);
    this.removeSelectedSubtitle();
    let id = this.#doAdd(first);
    this.#doAdd(second);
    this.#selectedSubtitleId.set(id);
  }

  mergeSelectedSubtitleWithNext() {
    let selected = this.selectedSubtitle();
    if (!selected) return;
    let index = this.subtitles().findIndex((s) => s.id === this.selectedSubtitleId());
    if (index + 1 === this.subtitles().length) return;
    let next = this.subtitles()[index + 1];
    this.updateCurrentSubtitle(
      selected?.subtitle.fromTime,
      next.subtitle.toTime,
      selected.subtitle.text + '\n' + next.subtitle.text,
    );
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
        sub.id === id ? { ...sub, subtitle: new Subtitle(fromTime, toTime, text) } : sub,
      );
    });
  }

  updateCurrentSubtitle(fromTime: number, toTime: number, text: string) {
    if (!this.selectedSubtitleId()) return;
    this.updateSubtitle(this.selectedSubtitleId()!, fromTime, toTime, text);
  }

  private shiftSubtitlesByCondition(msShift: number, conditionFn: (sub: any) => boolean) {
    this.#subtitles.update((currentSubtitles) => {
      return currentSubtitles.map((subAndId) => {
        if (conditionFn(subAndId)) {
          return {
            ...subAndId,
            subtitle: new Subtitle(
              Math.max(subAndId.subtitle.fromTime + msShift, 0),
              Math.max(subAndId.subtitle.toTime + msShift, 0),
              subAndId.subtitle.text,
            ),
          };
        }
        return subAndId;
      });
    });
  }

  shiftSingleSubtitle(id: any, msShift: number) {
    this.shiftSubtitlesByCondition(msShift, (sub) => sub.id === id);
  }

  shiftSubtitlesFrom(fromTime: number, msShift: number) {
    this.shiftSubtitlesByCondition(msShift, (sub) => sub.subtitle.fromTime >= fromTime);
  }

  shiftAllSubtitles(msShift: number) {
    this.shiftSubtitlesByCondition(msShift, () => true);
  }

  setVideoUrl(videoUrl: SafeUrl) {
    this.#videoUrl.set(videoUrl);
  }

  toggleVideoMode() {
    this.#videoMode.update((mode) => !mode);
  }

  toggleAudioMode() {
    this.#audioMode.update((mode) => !mode);
  }

  play() {
    this.#isPlaying.set(true);
  }

  playSelection() {
    if(!this.playbackBoundary()) return;
    this.setCurrentTime(this.playbackBoundary()!.start);
    this.#isPlaying.set(true);
  }

  pause() {
    this.#isPlaying.set(false);
    this.#playForever.set(false);
  }

  toggleDarkMode() {
    this.#isDarkMode.update((v) => !v);
  }

  updateShiftMode(v: ShiftMode) {
    this.#shiftMode.set(v);
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

      subs.push(new Subtitle(startMs, endMs, text));
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

  saveToLocalStorage() {
    if (this.subtitles().length === 0) return;

    const dataToSave = JSON.stringify(this.subtitles());
    localStorage.setItem('srt_autosave_data', dataToSave);

    if (this.subtitleFileName()) {
      localStorage.setItem('srt_autosave_filename', this.subtitleFileName()!);
    }

    // Reset the flag since changes are now saved
    this.#hasPendingChanges.set(false);
    console.log('Auto-saved to localStorage');
  }

  downloadSrtFile() {
    if (this.subtitles().length === 0) return;

    const srtContent = this.subtitles()
      .map((subAndId, index) => this.#formatSrt(index + 1, subAndId.subtitle))
      .join('');

    const fileName = this.subtitleFileName() || 'subtitles.srt';

    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();

    window.URL.revokeObjectURL(url);

    // Reset the flag since the user explicitly downloaded the file
    this.#hasPendingChanges.set(false);
  }

  #formatSrt(idx: number, sub: Subtitle): string {
    const timestamps = `${this.#formatMs.transform(sub.toTime, ',')} --> ${this.#formatMs.transform(sub.toTime, ',')}`;
    return `${idx}\n${timestamps}\n${sub.text}\n\n`;
  }

  playSelectionForever() {
    this.#playForever.set(true);
    this.playSelection()
  }
}
