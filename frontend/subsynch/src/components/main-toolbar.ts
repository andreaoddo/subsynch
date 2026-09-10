import { Component, inject } from '@angular/core';
import { ContextService } from './context.service';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { DomSanitizer } from '@angular/platform-browser';


@Component({
  selector: 'app-main-toolbar',
  imports: [MatToolbar, MatToolbarRow, MatIconButton, MatTooltip],
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
          (click)="context.save_srt()"
        >
          <span class="material-symbols-outlined">save</span>
        </button>
        <button matIconButton class="material-btn" disabled>
          <span class="material-symbols-outlined" style="transform: rotate(90deg);">
            horizontal_rule
          </span>
        </button>

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

        <button matIconButton class="material-btn" disabled>
          <span class="material-symbols-outlined" style="transform: rotate(90deg);">
            horizontal_rule
          </span>
        </button>

        <button matIconButton class="material-btn" (click)="context.addNewSubtitle()">
          <span class="material-symbols-outlined"> variable_add </span>
        </button>
        <button matIconButton class="material-btn" (click)="context.removeSelectedSubtitle()">
          <span class="material-symbols-outlined">variable_remove</span>
        </button>

        <button matIconButton class="material-btn" disabled>
          <span class="material-symbols-outlined" style="transform: rotate(90deg);">
            horizontal_rule
          </span>
        </button>

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
      this.context.load_srt(file.name);
      input.value = '';
    }
  }

  onVideoFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.context.load_video_file(file.name);
      input.value = '';
      const objectUrl = URL.createObjectURL(file);
      this.context.setVideoUrl(this.#sanitizer.bypassSecurityTrustUrl(objectUrl));
    }
  }
}
