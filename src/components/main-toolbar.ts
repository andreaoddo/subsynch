import { Component, inject } from '@angular/core';
import { ContextService } from './context.service';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { DomSanitizer } from '@angular/platform-browser';
import { SeparatorButton } from './separator-button';
import { MatBadgeModule } from '@angular/material/badge';



@Component({
  selector: 'app-main-toolbar',
  imports: [MatToolbar, MatToolbarRow, MatIconButton, MatTooltip, SeparatorButton, MatBadgeModule],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `
    <mat-toolbar>
      <mat-toolbar-row>
        <input
          type="file"
          #fileInput
          style="display: none"
          (change)="onSubtitleFileSelected($event)"
        />
        <button
          matIconButton
          matTooltip="Open subtitles"
          class="material-btn"
          (click)="fileInput.click()"
        >
          <span class="material-symbols-outlined">file_open</span>
        </button>
        <button
          matIconButton
          matTooltip="Save subtitles"
          class="material-btn"
          (click)="context.saveToLocalStorage()"
        >
          <span
            class="material-symbols-outlined"
            matBadge="!"
            matBadgeColor="warn"
            matBadgePosition="below after"
            [matBadgeHidden]="!context.hasPendingChanges()"
            >save</span
          >
        </button>
        <button
          matIconButton
          matTooltip="Download srt"
          class="material-btn"
          (click)="context.downloadSrtFile()"
        >
          <span class="material-symbols-outlined">download</span>
        </button>
        <app-separator-button />

        <input
          type="file"
          #videoInput
          style="display: none"
          (change)="onVideoFileSelected($event)"
        />
        <button
          matIconButton
          matTooltip="Open video"
          class="material-btn"
          (click)="videoInput.click()"
        >
          <div>
            <span class="material-symbols-outlined">video_camera_back_add</span>
          </div>
        </button>

        <app-separator-button />

        <button
          matIconButton
          matTooltip="{{ context.audioMode() ? 'Disable audio' : 'Enable audio' }}"
          class="material-btn"
          [disabled]="!context.videoUrl()"
          (click)="context.toggleAudioMode()"
        >
          <span class="material-symbols-outlined">{{
            context.audioMode() ? 'volume_up' : 'volume_off'
          }}</span>
        </button>

        <button
          matIconButton
          matTooltip="{{ context.videoMode() ? 'Disable video' : 'Enable video' }}"
          class="material-btn"
          [disabled]="!context.videoUrl()"
          (click)="context.toggleVideoMode()"
        >
          <span class="material-symbols-outlined">
            {{ context.videoMode() ? 'movie' : 'movie_off' }}
          </span>
        </button>

        <app-separator-button />

        <button
          matIconButton
          matTooltip="{{ context.isDarkMode() ? 'Enable light mode' : 'Enable dark mode' }}"
          class="material-btn"
          (click)="context.toggleDarkMode()"
        >
          <span class="material-symbols-outlined">
            {{ context.isDarkMode() ? 'dark_mode' : 'light_mode' }}</span
          >
        </button>

        <app-separator-button />

        <button
          matIconButton
          matTooltip="Reset view"
          class="material-btn"
          (click)="context.restart()"
        >
          <span class="material-symbols-outlined">restart_alt</span>
        </button>
      </mat-toolbar-row>
    </mat-toolbar>
  `,
})
export class MainToolbarComponent {
  context = inject(ContextService);
  #sanitizer = inject(DomSanitizer);

  onSubtitleFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.context.load_srt(file);
      input.value = '';
    }
  }

  onVideoFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.context.load_video_file(file);
      input.value = '';
      const objectUrl = URL.createObjectURL(file);
      this.context.setVideoUrl(this.#sanitizer.bypassSecurityTrustUrl(objectUrl));
    }
  }
}
