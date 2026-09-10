import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContextService } from './context.service';

@Component({
  selector: 'app-waveform-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #viewport class="viewport" (wheel)="onWheel($event)">
      <div class="track" [style.width.px]="totalWidth()" (mousedown)="onTrackMouseDown($event)">
        <canvas #waveformCanvas></canvas>

        @if (context.selectionRange()) {
          <div
            class="selection-box"
            [style.left.px]="(context.selectionRange()!.start * pixelsPerSecond()) / 1000.0"
            [style.width.px]="
              ((context.selectionRange()!.end - context.selectionRange()!.start) *
                pixelsPerSecond()) /
              1000.0
            "
            [style.height.px]="waveformHeight()"
          ></div>
        }

        @for (sub of context.subtitles(); track $index) {
          <div
            class="subtitle-box"
            [class.selected]="sub.id === context.selectedSubtitleId()"
            [style.left.px]="(sub.subtitle.fromTime / 1000) * pixelsPerSecond()"
            [style.width.px]="
              ((sub.subtitle.toTime - sub.subtitle.fromTime) / 1000) * pixelsPerSecond()
            "
            [style.height.px]="waveformHeight()"
            (click)="onSubtitleClick($event, sub.id)"
          >
            <div
              class="resize-handle left"
              (mousedown)="onResizeStart($event, sub.id, 'left')"
            ></div>
            <span class="subtitle-text">{{ sub.subtitle.text }}</span>
            <div
              class="resize-handle right"
              (mousedown)="onResizeStart($event, sub.id, 'right')"
            ></div>
          </div>
        }

        <div
          class="playhead"
          [style.left.px]="(context.currentTime() * pixelsPerSecond()) / 1000.0"
        ></div>
      </div>
    </div>
  `,
  styles: [
    `
      .viewport {
        width: 100%;
        height: 25vh;
        overflow-x: auto;
        overflow-y: hidden;
        background-color: #1a1a1a;
        position: relative;
        scroll-behavior: auto;
      }

      .track {
        position: relative;
        height: 100%;
        cursor: pointer;
      }

      canvas {
        position: sticky;
        top: 0;
        left: 0;
        pointer-events: none;
      }

      .subtitle-box {
        position: absolute;
        top: 0;
        box-sizing: border-box;
        border-left: 2px solid #00e5ff;
        border-right: 2px solid #00e5ff;
        //background-color: rgba(0, 229, 255, 0.15);

        background: linear-gradient(
          to bottom,
          rgba(0, 229, 255, 0) 0%,
          rgba(0, 229, 255, 0.15) 30%,
          rgba(0, 229, 255, 0.15) 70%,
          rgba(0, 229, 255, 0) 100%
        );
        display: flex;
        align-items: flex-end;
        justify-content: flex-start;
        padding: 4px;
        pointer-events: auto;
        cursor: pointer;
        z-index: 10;
      }

      /* Override only the colors when selected */
      .subtitle-box.selected {
        border-color: #ffcc00;
        background: linear-gradient(
          to bottom,
          rgba(255, 204, 0, 0) 0%,
          rgba(255, 204, 0, 0.15) 30%,
          rgba(255, 204, 0, 0.15) 70%,
          rgba(255, 204, 0, 0) 100%
        );
        z-index: 11;
      }

      .subtitle-text {
        color: #ffffff;
        font-size: 12px;
        font-family: sans-serif;
        font-weight: bold;
        width: 100%;
        white-space: pre-line;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.8);
      }

      .playhead {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background-color: #ff3366;
        pointer-events: none;
        z-index: 20;
        box-shadow: 0 0 4px rgba(255, 51, 102, 0.5);
      }

      .playhead::before {
        content: '';
        position: absolute;
        top: 0;
        left: -4px;
        width: 10px;
        height: 10px;
        background-color: #ff3366;
        border-radius: 50%;
      }

      .resize-handle {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 10px;
        cursor: ew-resize; /* Shows the horizontal double-arrow cursor */
        z-index: 12;
      }

      .resize-handle.left {
        left: 0;
      }

      .resize-handle.right {
        right: 0;
      }

      .selection-box {
        position: absolute;
        top: 0;
        box-sizing: border-box;
        background-color: rgba(255, 255, 255, 0.2);
        border-left: 1px dashed #ffffff;
        border-right: 1px dashed #ffffff;
        pointer-events: none; /* Let clicks pass through if dragging again */
        z-index: 5; /* Below subtitles, above canvas */
      }
    `,
  ],
})
export class WaveformVisualizerComponent implements AfterViewInit, OnDestroy {
  context = inject(ContextService);

  visibleSeconds = input(20);

  viewportRef = viewChild<ElementRef<HTMLDivElement>>('viewport');
  canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('waveformCanvas');

  containerWidth = signal(800);
  containerHeight = signal(150);
  timelineHeight = 30;

  waveformHeight = computed(() => Math.max(10, this.containerHeight() - this.timelineHeight));
  pixelsPerSecond = computed(() => this.containerWidth() / this.visibleSeconds());

  totalWidth = computed(() => {
    const totalDurationSeconds = this.context.waveform().length * 0.01;
    return totalDurationSeconds * this.pixelsPerSecond();
  });

  private resizeObserver?: ResizeObserver;
  private animationFrameId?: number;

  private lastScrollLeft = -1;
  private lastContainerW = -1;
  private lastTrackH = -1;
  private lastWfLength = -1;
  private lastPps = -1;

  private draggingSubId: string | null = null;
  private dragEdge: 'left' | 'right' | null = null;
  private dragStartX = 0;
  private originalTimeMs = 0;

  private isTrackDragging = false;
  private trackDragStartX = 0;
  private trackDragStartTime = 0;
  MIN_DURATION_MS = 100;

  constructor() {
    effect(() => {
      const activeId = this.context.selectedSubtitleId();
      const viewport = this.viewportRef()?.nativeElement;

      if (activeId !== null && viewport) {
        const activeSub = untracked(() => this.context.selectedSubtitle()!.subtitle);
        const subCenterPixel =
          (((activeSub.toTime + activeSub.fromTime) / 1000) * this.pixelsPerSecond()) / 2;
        const containerHalfWidth = this.containerWidth() / 2;
        const targetScrollLeft = Math.max(0, subCenterPixel - containerHalfWidth);

        viewport.scrollTo({
          left: targetScrollLeft,
          behavior: 'smooth',
        });
      }
    });
  }

  ngAfterViewInit(): void {
    const viewport = this.viewportRef()?.nativeElement;
    if (!viewport) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        this.containerWidth.set(entries[0].contentRect.width);
        this.containerHeight.set(entries[0].contentRect.height);
      }
    });
    this.resizeObserver.observe(viewport);
    this.startRenderLoop();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }

  onWheel(event: WheelEvent): void {
    const viewport = this.viewportRef()?.nativeElement;
    if (!viewport) return;
    if (event.deltaY !== 0) {
      event.preventDefault();
      viewport.scrollLeft += event.deltaY;
    }
  }

  onTrackMouseDown(event: MouseEvent): void {
    const trackEl = event.currentTarget as HTMLElement;
    const rect = trackEl.getBoundingClientRect();

    this.trackDragStartX = event.clientX - rect.left;
    this.trackDragStartTime = (this.trackDragStartX / this.pixelsPerSecond()) * 1000.0;
    this.isTrackDragging = true;

    // Clear any existing selection upon starting a new click/drag
    this.context.setSelectionRange(null);
  }

  onSubtitleClick(event: MouseEvent, id: string): void {
    this.context.setCurrentSubtitle(id);
    event.stopPropagation();
  }

  onResizeStart(event: MouseEvent, id: string, edge: 'left' | 'right'): void {
    event.stopPropagation(); // Prevent subtitle box click

    this.context.setCurrentSubtitle(id); // Select it while resizing
    this.draggingSubId = id;
    this.dragEdge = edge;
    this.dragStartX = event.clientX;

    const sub = this.context.selectedSubtitle();
    if (!sub) return;
    this.originalTimeMs = edge === 'left' ? sub!.subtitle.fromTime : sub!.subtitle.toTime;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.draggingSubId !== null && this.dragEdge) {
      const deltaMs = Math.round(
        ((event.clientX - this.dragStartX) * 1000) / this.pixelsPerSecond(),
      );

      const targetSub = this.context.subtitles().find((sub) => sub.id === this.draggingSubId);
      if (!targetSub) return;

      const currentSubtitle = targetSub.subtitle;
      let newFromTime = currentSubtitle.fromTime;
      let newToTime = currentSubtitle.toTime;

      if (this.dragEdge === 'left') {
        newFromTime = Math.max(
          0,
          Math.min(currentSubtitle.toTime - this.MIN_DURATION_MS, this.originalTimeMs + deltaMs),
        );
      } else {
        newToTime = Math.max(
          currentSubtitle.fromTime + this.MIN_DURATION_MS,
          this.originalTimeMs + deltaMs,
        );
      }
      this.context.updateSubtitle(this.draggingSubId, newFromTime, newToTime, currentSubtitle.text);
      return;
    }

    if (this.isTrackDragging) {
      const trackEl = this.viewportRef()?.nativeElement.querySelector('.track');
      if (trackEl) {
        const rect = trackEl.getBoundingClientRect();
        const currentX = event.clientX - rect.left;

        // If the mouse has moved more than 3 pixels, treat it as a drag (selection)
        if (Math.abs(currentX - this.trackDragStartX) > 3) {
          const currentTime = Math.max(0, Math.round((currentX * 1000.0) / this.pixelsPerSecond()));

          this.context.setSelectionRange({
            start: Math.min(this.trackDragStartTime, currentTime),
            end: Math.max(this.trackDragStartTime, currentTime),
          });
        }
      }
    }
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    this.draggingSubId = null;
    this.dragEdge = null;

    if (this.isTrackDragging) {
      if (!this.context.selectionRange()) {
        this.context.setCurrentTime(this.trackDragStartTime);
      }
      this.isTrackDragging = false;
    }
  }

  private startRenderLoop(): void {
    const loop = () => {
      this.renderIfNeeded();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private renderIfNeeded(): void {
    const viewport = this.viewportRef()?.nativeElement;
    if (!viewport) return;

    const scrollLeft = viewport.scrollLeft;
    const containerW = this.containerWidth();
    const trackH = this.containerHeight();
    const wf = this.context.waveform();
    const pps = this.pixelsPerSecond();

    if (
      scrollLeft !== this.lastScrollLeft ||
      containerW !== this.lastContainerW ||
      trackH !== this.lastTrackH ||
      wf.length !== this.lastWfLength ||
      pps !== this.lastPps
    ) {
      this.lastScrollLeft = scrollLeft;
      this.lastContainerW = containerW;
      this.lastTrackH = trackH;
      this.lastWfLength = wf.length;
      this.lastPps = pps;

      const canvas = this.canvasRef()?.nativeElement;
      if (canvas) {
        if (wf.length > 0) {
          this.drawTrack(canvas, wf, pps, this.waveformHeight(), trackH, scrollLeft, containerW);
        } else {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      }
    }
  }

  private drawTrack(
    canvas: HTMLCanvasElement,
    wf: number[],
    pps: number,
    wfHeight: number,
    trackH: number,
    scrollLeft: number,
    containerW: number,
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerW * dpr;
    canvas.height = trackH * dpr;
    canvas.style.width = `${containerW}px`;
    canvas.style.height = `${trackH}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, containerW, trackH);

    ctx.fillStyle = '#4a90e2';
    const centerY = wfHeight / 2;
    const step = 0.01 * pps;

    const minWidth = 1 / dpr;

    const startIndex = Math.max(0, Math.floor(scrollLeft / step));
    const endIndex = Math.min(wf.length, Math.ceil((scrollLeft + containerW) / step));

    ctx.beginPath();
    for (let i = startIndex; i < endIndex; i++) {
      const x = i * step - scrollLeft;
      const barHeight = wf[i] * (wfHeight * 0.8);
      ctx.rect(x, centerY - barHeight / 2, Math.max(step, minWidth), barHeight);
    }
    ctx.fill();

    this.drawTimeline(ctx, wf.length * 0.01, pps, wfHeight, scrollLeft, containerW);
  }

  private drawTimeline(
    ctx: CanvasRenderingContext2D,
    durationSeconds: number,
    pps: number,
    wfHeight: number,
    scrollLeft: number,
    containerW: number,
  ): void {
    ctx.fillStyle = '#888888';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';

    ctx.fillRect(0, wfHeight, containerW, 1);

    // Calculate visible timeline boundary
    const startS = Math.max(0, Math.floor(scrollLeft / pps));
    const endS = Math.min(durationSeconds, Math.ceil((scrollLeft + containerW) / pps));

    for (let s = startS; s <= endS; s++) {
      const x = s * pps - scrollLeft;

      if (s % 5 === 0) {
        ctx.fillRect(x - 1, wfHeight, 2, 8);
        ctx.fillText(this.formatTime(s), x, wfHeight + 22);
      } else {
        ctx.fillRect(x, wfHeight, 1, 4);
      }
    }
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
