import { Component, computed, inject, effect, viewChild, ElementRef } from '@angular/core';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { ContextService } from './context.service';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';
import { MatRadioModule } from '@angular/material/radio';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

@Component({
  selector: 'app-subtitle-editor',
  standalone: true,
  imports: [
    MatFormField,
    MatInput,
    ReactiveFormsModule,
    MatLabel,
    MatButton,
    MatTooltip,
    MatSliderModule,
    MatRadioModule,
    MatToolbar,
    MatIconButton,
    MatButtonToggleModule,
  ],
  styles: [
    `
      :host {
        display: block;
        margin-bottom: 10px;
      }

      textarea {
        resize: none;
      }

      .sub-label {
        font-weight: bold;
        color: var(--mat-sys-primary);
      }

      .group {
        display: flex;
        align-items: center;
        margin: 15px 15px 0 15px;
        padding: 5px 20px 0px 20px;
        background-color: var(--mat-sys-surface-container);
        border: 1px solid var(--mat-sys-outline-variant);
        border-radius: 5px;
      }

      .button-group {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 15px 15px 0 15px;
        padding: 5px 20px 0px 20px;
        background-color: var(--mat-sys-surface-container);
        border: 1px solid var(--mat-sys-outline-variant);
        border-radius: 5px;
      }

      .time-indicators {
        padding: 10px;

        .time-indicator {
          display: flex;
          flex-direction: row;
          margin-left: 10px;
        }
      }

      .grid-container {
        display: grid;
        grid-template-columns: repeat(2, 1fr); /* Crea 2 colonne di uguale larghezza */
      }
    `,
  ],
  template: `
    <div style="display: flex; flex-direction: row; height: auto;">
      <div class="button-group group">
        <div class="sub-label">Subtitle actions</div>
        <div class="grid-container">
          <button
            matIconButton
            class="material-btn action-button"
            matTooltip="Add"
            (click)="context.addNewSubtitle()"
          >
            <span class="material-symbols-outlined"> variable_add </span>
          </button>
          <button
            matIconButton
            class="material-btn action-button"
            matTooltip="Remove"
            (click)="context.removeSelectedSubtitle()"
          >
            <span class="material-symbols-outlined">variable_remove</span>
          </button>
          <button
            matIconButton
            class="material-btn action-button"
            matTooltip="Split"
            (click)="context.splitSelectedSubtitle()"
          >
            <span class="material-symbols-outlined">splitscreen</span>
          </button>
          <button
            matIconButton
            class="material-btn action-button"
            matTooltip="Merge with next"
            (click)="context.mergeSelectedSubtitleWithNext()"
          >
            <span class="material-symbols-outlined">stack_group</span>
          </button>
        </div>
      </div>

      <div class="group">
        <mat-form-field style="width: 25vw;" subscriptSizing="dynamic">
          <mat-label>Text</mat-label>
          <textarea
            #subtitleInput
            matInput
            [value]="currentSubText() || ' '"
            (input)="onTextChanged($event)"
          ></textarea>
        </mat-form-field>
        <div class="time-indicators">
          <span class="time-indicator">
            <div class="sub-label" style="width: 3.5vw">Start time</div>
            <div>{{ formatMs(currentSubFrom()) }}</div>
          </span>
          <span class="time-indicator">
            <div class="sub-label" style="width: 3.5vw">End time</div>
            <div>{{ formatMs(currentSubTo()) }}</div>
          </span>
          <span class="time-indicator">
            <div class="sub-label" style="width: 3.5vw">Duration</div>
            <div>{{ formatMs(currentSubDuration()) }}</div>
          </span>
          <span class="time-indicator">
            <div class="sub-label" style="width: 3.5vw">Cursor</div>
            <div>{{ formatMs(context.currentTime()) }}</div>
          </span>
        </div>
      </div>
      <div class="button-group group">
        <div class="sub-label">Shift selection</div>
        <div>
          <button
            matIconButton
            matTooltip="-100ms"
            class="material-btn action-button"
            (click)="shift(-100)"
          >
            <span class="material-symbols-outlined">keyboard_double_arrow_left</span>
          </button>
          <button
            matIconButton
            matTooltip="-10ms"
            class="material-btn action-button"
            (click)="shift(-10)"
          >
            <span class="material-symbols-outlined">keyboard_arrow_left</span>
          </button>
          <button
            matIconButton
            matTooltip="+10ms"
            class="material-btn action-button"
            (click)="shift(10)"
          >
            <span class="material-symbols-outlined">keyboard_arrow_right</span>
          </button>
          <button
            matIconButton
            matTooltip="+100ms"
            class="material-btn action-button"
            (click)="shift(100)"
          >
            <span class="material-symbols-outlined">keyboard_double_arrow_right</span>
          </button>
        </div>
        <mat-button-toggle-group
          name="fontStyle"
          aria-label="Font Style"
          style="margin-bottom: 10px;"
          [value]="context.shiftMode()"
          (change)="context.updateShiftMode($event.value)"
        >
          <mat-button-toggle value="THIS">This</mat-button-toggle>
          <mat-button-toggle value="TO_END">To end</mat-button-toggle>
          <mat-button-toggle value="ALL">All</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <div class="button-group group">
        <div class="sub-label">Player controls</div>
        <div>
          <button
            matIconButton
            class="material-btn"
            (click)="context.play()"
            [disabled]="!context.videoFileName()"
          >
            <span class="material-symbols-outlined">play_arrow</span>
          </button>
          <button
            matIconButton
            class="material-btn"
            (click)="context.pause()"
            [disabled]="!context.videoFileName()"
          >
            <span class="material-symbols-outlined">pause</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SubtitleEditorComponent {
  context = inject(ContextService);
  subtitleInput = viewChild<ElementRef<HTMLTextAreaElement>>('subtitleInput');

  currentSubText = computed(() => this.context.selectedSubtitle()?.subtitle.text);
  currentSubFrom = computed(() => this.context.selectedSubtitle()?.subtitle.fromTime);
  currentSubTo = computed(() => this.context.selectedSubtitle()?.subtitle.toTime);
  currentSubDuration = computed(() => (this.currentSubTo() ?? 0) - (this.currentSubFrom() ?? 0));

  constructor() {
    effect(() => {
      let currentSub = this.context.selectedSubtitle();
      let subInput = this.subtitleInput()
      if(currentSub && subInput) {
        subInput.nativeElement.focus();
      }
    });
  }

  onTextChanged(event: Event): void {
    const newText = (event.target as HTMLTextAreaElement).value;

    if (this.context.selectedSubtitle()) {
      this.#updateCurrentSubtitle(
        this.context.selectedSubtitle()!.subtitle.fromTime,
        this.context.selectedSubtitle()!.subtitle.toTime,
        newText,
      );
    }
  }

  shift(ms: number) {
    const selectedSub = this.context.selectedSubtitle();
    switch (this.context.shiftMode()) {
      case 'THIS':
        if (!selectedSub) return;
        this.context.shiftSingleSubtitle(selectedSub.id, ms);
        break;

      case 'TO_END':
        if (!selectedSub) return;
        this.context.shiftSubtitlesFrom(selectedSub.subtitle.fromTime, ms);
        break;

      case 'ALL':
        this.context.shiftAllSubtitles(ms);
        break;
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
    this.context.updateCurrentSubtitle(fromTime, toTime, text);
  }
}
