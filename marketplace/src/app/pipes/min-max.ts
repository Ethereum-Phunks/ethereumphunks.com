import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'minMax',
  standalone: true,
})
export class MinMaxPipe implements PipeTransform {
  transform(value: number[] | string[], type: 'min' | 'max'): number {
    if (typeof value === 'string') return 0;
    return type === 'min' ? Math.min(...value as number[]) : Math.max(...value as number[]);
  }
}
