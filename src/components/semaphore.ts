import { Component, input, computed, inject } from '@angular/core';
import { SubtitleSpeed } from './dto';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { ContextService } from './context.service';

@Component({
  selector: 'app-semaphore',
  template: `
    <mat-chip class="centered-chip" label-text-size="20" [style.background-color]="this.color()">{{
      this.tooltip()
    }}</mat-chip>

    <!--    <button matIconButton class="material-btn no-disc-button" [matTooltip]="this.tooltip()" matTooltipPosition="after" disableRipple>-->
    <!--      <span class="material-symbols-outlined" [style.color]="this.color()">-->
    <!--        radio_button_checked-->
    <!--      </span>-->
    <!--    </button>-->
  `,
  styles: [
    `
      .no-disc-button {
        --mat-icon-button-state-layer-color: transparent;
        /* Optional: removes the default padding if you want it completely flush */
        padding: 0;
        height: fit-content;
      }

      .centered-chip {
        width: 72px !important;
        height: 24px !important;
        min-height: 24px !important;
        border: none !important; /* Removes standard borders */
        text-transform: uppercase !important;
      }

      /* Hides the specific outline element used by modern Material chips */
      ::ng-deep .centered-chip .mdc-evolution-chip__outline,
      ::ng-deep .centered-chip .mat-mdc-chip-action::before {
        border: none !important;
        display: none !important;
      }

      ::ng-deep .centered-chip .mat-mdc-chip-action,
      ::ng-deep .centered-chip .mdc-evolution-chip__action {
        width: 100% !important;
        justify-content: center !important;
        padding: 0 8px !important;
        align-items: center !important;
        border: none !important; /* Failsafe for inner wrappers */
      }

      ::ng-deep .centered-chip .mat-mdc-chip-action-label,
      ::ng-deep .centered-chip .mdc-evolution-chip__text-label {
        text-align: center;
        width: 100%;
        font-size: 12px !important;
        line-height: normal !important;
      }
    `,
  ],
  imports: [MatIconButton, MatTooltip, MatChipsModule],
})
export class SemaphoreComponent {
  speed = input<SubtitleSpeed | null>();
  context = inject(ContextService);

  color = computed(() => {
    let speed = this.speed();
    if (!speed) return;
    const lightModeColors: Record<string, string> = {
      TOO_FAST: '#D88282', // Soft, muted brick red
      FAST: '#DCA171', // Warm, subdued terracotta
      FLASH: '#E2C16B', // Soft goldenrod
      OPTIMAL: '#8CBA97', // Calming sage green
      SLOW: '#84A4BD', // Soft steel blue
    };

    const darkModeColors: Record<string, string> = {
      TOO_FAST: '#934545', // Deep rust/maroon
      FAST: '#9A5F32', // Dark copper
      FLASH: '#8C7032', // Dark bronze/mustard
      OPTIMAL: '#447855', // Deep moss green
      SLOW: '#446785', // Deep denim/slate blue
    };

    return this.context.isDarkMode() ? darkModeColors[speed] : lightModeColors[speed];
  });

  tooltip = computed(() => {
    let speed = this.speed();
    if (!speed) return;
    const tooltip: Record<string, string> = {
      TOO_FAST: 'Too fast',
      FAST: 'Fast',
      FLASH: 'Flash',
      OPTIMAL: 'Ok',
      SLOW: 'Slow',
    };
    return tooltip[speed];
  });
}
