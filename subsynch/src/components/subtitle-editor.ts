import { Component, computed, inject } from '@angular/core';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { ContextService } from './context.service';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-subtitle-editor',
  standalone: true,
  imports: [MatFormField, MatInput, ReactiveFormsModule, MatLabel, MatButton, MatTooltip],
  styles: [
    `
      :host {
        display: block;
      }

      textarea {
        resize: none;
      }

      .sub-label {
        font-weight: bold;
        color: rgb(0, 92, 187);
      }

      .action-button {
        box-shadow: #aaa 1px 1px 3px;
      }
    `,
  ],
  template: `
    <div style="display: flex; flex-direction: row">
      <mat-form-field style="width: 25vw; padding: 10px;">
        <mat-label>Text</mat-label>
        <textarea
          matInput
          [value]="currentSubText() || ' '"
          (input)="onTextChanged($event)"
        ></textarea>
      </mat-form-field>
      <div style="padding: 10px;">
        <span style="display: flex; flex-direction: row; margin-left: 10px">
          <div class="sub-label" style="width: 4vw">Start time</div>
          <div>{{ formatMs(currentSubFrom()) }}</div>
        </span>
        <span style="display: flex; flex-direction: row; margin-left: 10px">
          <div class="sub-label" style="width: 4vw">End time</div>
          <div>{{ formatMs(currentSubTo()) }}</div>
        </span>
        <span style="display: flex; flex-direction: row; margin-left: 10px">
          <div class="sub-label" style="width: 4vw">Duration</div>
          <div>{{ formatMs(currentSubDuration()) }}</div>
        </span>
        <span style="display: flex; flex-direction: row; margin-left: 10px">
          <div class="sub-label" style="width: 4vw">Cursor</div>
          <div>{{ formatMs(data.currentTime()) }}</div>
        </span>
      </div>
      <div
        style="display: flex; flex-direction: column; align-items: center; gap: 8px; margin: 15px; padding-top: 5px;"
      >
        <div class="sub-label">Shift selection</div>
        <div>
          <button
            matButton
            matTooltip="-100ms"
            style="box-shadow: #aaa 1px 1px 3px"
            class="material-btn action-button"
            (click)="shift(-100)"
          >
            <span class="material-symbols-outlined">keyboard_double_arrow_left</span>
          </button>
          <button matButton matTooltip="-10ms" class="material-btn action-button" (click)="shift(-10)">
            <span class="material-symbols-outlined">keyboard_arrow_left</span>
          </button>
          <button matButton matTooltip="+10ms" class="material-btn action-button" (click)="shift(10)">
            <span class="material-symbols-outlined">keyboard_arrow_right</span>
          </button>
          <button matButton matTooltip="+100ms" class="material-btn action-button" (click)="shift(100)">
            <span class="material-symbols-outlined">keyboard_double_arrow_right</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SubtitleEditorComponent {
  data = inject(ContextService);

  currentSubText = computed(() => this.data.selectedSubtitle()?.subtitle.text);
  currentSubFrom = computed(() => this.data.selectedSubtitle()?.subtitle.fromTime);
  currentSubTo = computed(() => this.data.selectedSubtitle()?.subtitle.toTime);
  currentSubDuration = computed(() => (this.currentSubTo() ?? 0) - (this.currentSubFrom() ?? 0));

  onTextChanged(event: Event): void {
    const newText = (event.target as HTMLTextAreaElement).value;

    if (this.data.selectedSubtitle()) {
      this.#updateCurrentSubtitle(
        this.data.selectedSubtitle()!.subtitle.fromTime,
        this.data.selectedSubtitle()!.subtitle.toTime,
        newText,
      );
    }
  }

  shift(ms: number) {
    if (!this.data.selectedSubtitle()) return;
    let fromTime = this.data.selectedSubtitle()!.subtitle.fromTime;
    let toTime = this.data.selectedSubtitle()!.subtitle.toTime;
    if (!fromTime || !toTime) return;

    let newFrom = Math.max(fromTime + ms, 0);
    let newTo = Math.max(toTime + ms, 0);

    if (this.data.selectedSubtitle()) {
      this.#updateCurrentSubtitle(newFrom, newTo, this.data.selectedSubtitle()!.subtitle.text);
    }
  }

  formatMs(millis: number | undefined): string {
    if (!millis) return '00:00:00.000';
    const pad = (num: number, len = 2) => String(num).padStart(len, '0');

    const milliseconds = millis % 1000;
    const totalSeconds = Math.floor(millis / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`;
  }

  #updateCurrentSubtitle(fromTime: number, toTime: number, text: string) {
    this.data.updateCurrentSubtitle(fromTime, toTime, text);
  }
}
