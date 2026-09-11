import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContextService } from './context.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { FormatMsPipe } from './formatms.pipe';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, MatToolbar, MatIconButton],
  template: `
    @if (this.context.videoUrl()) {
      @if (this.context.videoUrl()) {
        <div class="video-wrapper">
          <video
            #videoPlayer
            [src]="this.context.videoUrl()"
            crossorigin="anonymous"
            (play)="startTracking()"
            (pause)="stopTracking()"
            (seeking)="syncTime()"
          ></video>

          <mat-toolbar>
            <span class="spacer"></span>
            <div class="centered-buttons">
              <button matIconButton class="material-btn" (click)="play()">
                <span class="material-symbols-outlined">play_arrow</span>
              </button>
              <button matIconButton class="material-btn" (click)="pause()">
                <span class="material-symbols-outlined">pause</span>
              </button>
            </div>
            <span class="spacer"></span>
          </mat-toolbar>
        </div>
      }
    }
  `,
  styles: [
    `
      .video-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center; /* Centers the child elements horizontally */
        gap: 12px; /* Replaces manual margin to add breathing room between video and toolbar */
        padding: 10px;
        width: fit-content;
      }

      video {
        display: block;
        max-width: 100%;
        height: auto;
      }

      mat-toolbar {
        width: fit-content;
        background-color: #dddddd;
        border-radius: 30px;
        padding: 0 16px;
      }

      .spacer {
        flex: 1 1 auto;
      }

      .centered-buttons {
        display: flex;
        gap: 8px;
      }

      ::ng-deep video::cue {
        color: white; /* Text color */
        background-color: rgba(0, 0, 0, 0);
        font-family: 'Arial', sans-serif;
        font-size: 1.5rem;
        font-weight: bold;
        text-shadow: 2px 2px 4px #000000; /* Outline effect */
      }
    `,
  ],
})
export class VideoplayerComponent {
  context = inject(ContextService);
  private animationFrameId?: number;

  videoPlayer = viewChild<ElementRef<HTMLVideoElement>>('videoPlayer');
  constructor() {
    effect(() => {
      const subs = this.context.subtitles();
      const videoRef = this.videoPlayer();

      // Ensure the video element is actually rendered in the DOM
      if (!videoRef) return;
      const video = videoRef.nativeElement;

      // 1. Find our custom track, or create it if it doesn't exist
      let track = Array.from(video.textTracks).find((t) => t.label === 'MemorySubs');
      if (!track) {
        track = video.addTextTrack('subtitles', 'MemorySubs', 'en');
      }

      // 2. Force the track to display
      track.mode = 'showing';

      // 3. Clear any old subtitles (useful if subtitles change dynamically)
      if (track.cues) {
        const cues = Array.from(track.cues);
        cues.forEach((cue) => track.removeCue(cue));
      }

      // 4. Inject the new subtitles directly
      subs.forEach((s) => {
        // VTTCue requires times in seconds (float), so we divide ms by 1000
        const startSeconds = s.subtitle.fromTime / 1000;
        const endSeconds = s.subtitle.toTime / 1000;

        // Ensure valid times before adding to prevent browser DOM exceptions
        if (startSeconds >= 0 && endSeconds > startSeconds) {
          const cue = new VTTCue(startSeconds, endSeconds, s.subtitle.text);
          track!.addCue(cue);
        }
      });

      console.log(`Successfully injected ${subs.length} subtitles into memory.`);
    });

    effect(() => {
      const requestedTimeMs = this.context.currentTime();
      const video = this.videoPlayer()?.nativeElement;

      if (video) {
        const currentVideoMs = video.currentTime * 1000;

        // CRITICAL: Only seek if the difference is larger than 100ms.
        // If you don't do this, the video's timeupdate and this effect
        // will trigger each other in an infinite stuttering loop.
        if (Math.abs(currentVideoMs - requestedTimeMs) > 100) {
          video.currentTime = requestedTimeMs / 1000;
        }
      }
    });
  }

  startTracking(): void {
    const loop = () => {
      const video = this.videoPlayer()?.nativeElement;
      if (video && !video.paused) {
        this.context.setCurrentTime(video.currentTime * 1000);
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };

    // Cancel any existing loop just in case, then start a new one
    this.stopTracking();
    this.animationFrameId = requestAnimationFrame(loop);
  }

  stopTracking(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    // Do one final sync to ensure exact resting position
    this.syncTime();
  }

  syncTime(): void {
    const video = this.videoPlayer()?.nativeElement;
    if (video) {
      this.context.setCurrentTime(video.currentTime * 1000);
    }
  }

  play(): void {
    this.videoPlayer()?.nativeElement.play();
  }

  pause(): void {
    this.videoPlayer()?.nativeElement.pause();
  }

  onTimeUpdate(): void {
    const video = this.videoPlayer()?.nativeElement;
    if (video) {
      this.context.setCurrentTime(video.currentTime * 1000);
    }
  }
}
