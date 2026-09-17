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
    console.log(speed);
    if (!speed) return;
    const colors: Record<string, string> = {
      TOO_FAST: '#D47F7F',
      FAST: '#DDA173',
      FLASH: '#E6B86A',
      OPTIMAL: '#8EBA9A',
      SLOW: '#9396B9',
    };
    let color = colors[speed];
    console.log(color)
    return color;
  });

  tooltip = computed(() => {
    let speed = this.speed();
    if (!speed) return;
    const tooltip: Record<string, string> = {
      TOO_FAST: 'Too fast',
      FAST: 'Fast',
      FLASH: 'Fast flash',
      OPTIMAL: 'Optimal',
      SLOW: 'Slow',
    };
    return tooltip[speed];
  });
}
