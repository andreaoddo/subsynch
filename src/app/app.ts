import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SubtitleTable } from '../components/subtitle-table';
import { WaveformVisualizerComponent } from '../components/waveform-visualizer.component';
import { MainToolbarComponent } from '../components/main-toolbar';
import { SubtitleEditorComponent } from '../components/subtitle-editor';
import { VideoplayerComponent } from '../components/videoplayer';
import { ContextService } from '../components/context.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    SubtitleTable,
    WaveformVisualizerComponent,
    MainToolbarComponent,
    SubtitleEditorComponent,
    VideoplayerComponent,
  ],
  templateUrl: 'app.html',
  styles: [
    `
      .split-layout {
        display: flex;
        flex-direction: row;
        width: 100%;
        padding-right: 0;
      }

      .left-panel {
        flex: 1 1 auto;
        min-width: 0;
      }

      /* Add this to force the table to stretch into the empty space */
      .left-panel app-subtitle-table,
      .left-panel table {
        width: 100%;
      }

      .right-panel {
        flex: 0 0 auto;
        width: 40vw;
        max-width: 40vw;
        margin-left: auto;
      }
    `,
  ],
})
export class App {
  protected readonly title = signal('subsynch');
  context = inject(ContextService);
}
