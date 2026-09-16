import { Component } from '@angular/core';
import { MatIconButton } from '@angular/material/button';

@Component({
  selector: 'app-separator-button',
  imports: [MatIconButton],
  template: `
    <button matIconButton class="material-btn" disabled>
      <span class="material-symbols-outlined rotated"> horizontal_rule </span>
    </button>
  `,
  styles: [
    `
      .rotated {
        transform: rotate(90deg);
      }
    `,
  ],
})
export class SeparatorButton {}
