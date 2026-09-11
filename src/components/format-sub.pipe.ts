import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatSub',
  standalone: true,
})
export class FormatSubPipe implements PipeTransform {
  transform(text: string | null | undefined): string {
    if(!text) {
      return "";
    }

    return text.split('\n').join('|');
  }
}
