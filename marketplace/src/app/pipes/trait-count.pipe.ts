import { Pipe, PipeTransform } from '@angular/core';

import { rarityData } from '@/constants/collections';

@Pipe({
  standalone: true,
  name: 'traitCount'
})

export class TraitCountPipe implements PipeTransform {

  transform(value: string, slug: string): string {
    // console.log({value, slug});
    return rarityData[slug][value];
  }
}
