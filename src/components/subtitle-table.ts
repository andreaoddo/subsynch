import { Component, inject } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { FormatMsPipe } from './formatms.pipe';
import { FormatSubPipe } from './format-sub.pipe';
import { ContextService } from './context.service';
import { SemaphoreComponent } from './semaphore';

@Component({
  selector: 'app-subtitle-table',
  standalone: true,
  imports: [MatTableModule, FormatMsPipe, FormatSubPipe, SemaphoreComponent],
  styles: [
    `
      :host {
        display: block;
      }

      .table-container {
        height: 60vh;
        overflow: auto;
      }

      tr.mat-mdc-header-row {
        height: 36px; /* Default: ~56px */
      }

      tr.mat-mdc-row {
        height: 28px; /* Default: ~52px */
      }

      th.mat-mdc-header-cell,
      td.mat-mdc-cell {
        padding-top: 2px !important;
        padding-bottom: 2px !important;
        font-size: 12px;
      }

      table.mat-table {
        width: 100%;
        table-layout: fixed;
      }

      .mat-column-position {
        width: 2vw;
      }

      .mat-column-fromTime {
        width: 4vw;
      }

      .mat-column-toTime {
        width: 4vw;
      }

      .mat-column-duration {
        width: 4vw;
      }

      .mat-column-speed {
        width: 1vw;
      }

      .mat-column-text {
        width: auto;
      }

      .mat-mdc-row .mat-mdc-cell {
        border-bottom: 1px solid transparent;
        border-top: 1px solid transparent;
        cursor: pointer;
      }

      .mat-mdc-row:hover .mat-mdc-cell {
        border-color: currentColor;
      }

      /* Default (Light Mode) */
      .selected {
        background-color: #4a90e2;
        color: white; /* Ensure text is readable */
      }

      .selected {
        /* Uses your primary palette color automatically adjusting for light/dark mode */
        background-color: var(--mat-sys-primary);
        color: var(--mat-sys-on-primary);
      }
    `,
  ],
  template: `
    @if (context.subtitles().length > 0) {
      <div class="table-container">
        <table mat-table [dataSource]="context.subtitles()" class="mat-elevation-z8">
          <!-- Position Column -->
          <ng-container matColumnDef="position">
            <th mat-header-cell *matHeaderCellDef>#</th>
            <td mat-cell *matCellDef="let element; let i = index">{{ i + 1 }}</td>
          </ng-container>

          <!-- Start Column -->
          <ng-container matColumnDef="fromTime">
            <th mat-header-cell *matHeaderCellDef>Start</th>
            <td mat-cell *matCellDef="let element">{{ element.subtitle.fromTime | formatMs }}</td>
          </ng-container>

          <!-- End Column -->
          <ng-container matColumnDef="toTime">
            <th mat-header-cell *matHeaderCellDef>End</th>
            <td mat-cell *matCellDef="let element">{{ element.subtitle.toTime | formatMs }}</td>
          </ng-container>

          <ng-container matColumnDef="duration">
            <th mat-header-cell *matHeaderCellDef>Duration</th>
            <td mat-cell *matCellDef="let element">
              {{ element.subtitle.toTime - element.subtitle.fromTime | formatMs }}
            </td>
          </ng-container>

          <ng-container matColumnDef="speed">
            <th mat-header-cell *matHeaderCellDef>Speed</th>
            <td mat-cell *matCellDef="let element">
              <app-semaphore [speed]="element.subtitle.speed"></app-semaphore>
            </td>
          </ng-container>

          <!-- Text Column -->
          <ng-container matColumnDef="text">
            <th mat-header-cell *matHeaderCellDef>Text</th>
            <td mat-cell *matCellDef="let element">{{ element.subtitle.text | formatSub }}</td>
          </ng-container>

          <!-- Righe obbligatorie per il rendering di Angular Material -->
          <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
          <tr
            mat-row
            *matRowDef="let row; columns: displayedColumns"
            [class.selected]="row.id === context.selectedSubtitleId()"
            (click)="this.setCurrentSub(row.id)"
          ></tr>
        </table>
      </div>
    }
  `,
})
export class SubtitleTable {
  context = inject(ContextService);
  displayedColumns: string[] = ['position', 'fromTime', 'toTime', 'duration', 'speed', 'text'];

  setCurrentSub(i: string | null | undefined) {
    if (i === null || i === undefined) return;

    this.context.setCurrentSubtitle(i!);
  }
}
