import { Component, input, computed } from '@angular/core';
import { SubtitleSpeed } from './dto';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-semaphore',
  template: `
    <button matIconButton class="material-btn no-disc-button" [matTooltip]="this.tooltip()" matTooltipPosition="after" disableRipple>
      <span class="material-symbols-outlined" [style.color]="this.color()">
        radio_button_checked
      </span>
    </button>
  `,
  styles: [
    `
      .no-disc-button {
        --mat-icon-button-state-layer-color: transparent;
        /* Optional: removes the default padding if you want it completely flush */
        padding: 0;
        height: fit-content;
      }
    `,
  ],
  imports: [MatIconButton, MatTooltip],
})
export class SemaphoreComponent {
  speed = input<SubtitleSpeed | null>();

  color = computed(() => {
    let speed = this.speed();
    if (!speed) return;
    switch (speed!) {
      case 'TOO_FAST':
        return '#D32F2F';
      case 'WARNING_FAST':
        return '#F57C00';
      case 'OPTIMAL':
        return '#388E3C';
      case 'WARNING_SLOW':
        return '#0288D1';
      case 'TOO_SLOW':
        return '#283593';
    }
  });

  tooltip = computed(() => {
    let speed = this.speed();
    if (!speed) return;
    switch (speed!) {
      case 'TOO_FAST':
        return 'Too fast';
      case 'WARNING_FAST':
        return 'Fast';
      case 'OPTIMAL':
        return 'Optimal';
      case 'WARNING_SLOW':
        return 'Slow';
      case 'TOO_SLOW':
        return 'Too slow';
    }
  });
}
