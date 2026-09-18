import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatMs',
  standalone: true,
})
export class FormatMsPipe implements PipeTransform {
  transform(ms: number | null | undefined, delimiter: string = '.'): string {
    if (ms == null || isNaN(ms) || ms < 0) return `00:00:00${delimiter}000`;

    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1_000);
    const milliseconds = Math.floor(ms % 1_000);

    const pad = (val: number, size: number) => val.toString().padStart(size, '0');

    return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}${delimiter}${pad(milliseconds, 3)}`;
  }
}
