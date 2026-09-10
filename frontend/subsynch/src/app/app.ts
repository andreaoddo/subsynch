import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SubtitleTable } from '../components/subtitle-table';
import { WaveformVisualizerComponent } from '../components/waveform-visualizer.component';
import { MainToolbarComponent } from '../components/main-toolbar';
import { SubtitleEditorComponent } from '../components/subtitle-editor';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    SubtitleTable,
    WaveformVisualizerComponent,
    MainToolbarComponent,
    SubtitleEditorComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('subsynch');
}
