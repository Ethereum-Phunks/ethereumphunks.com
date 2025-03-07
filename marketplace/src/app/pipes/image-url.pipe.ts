import { Phunk } from '@/models/db';
import { Pipe, PipeTransform } from '@angular/core';

import { environment } from 'src/environments/environment';

@Pipe({
  standalone: true,
  name: 'imageUrlPipe'
})
export class ImageUrlPipe implements PipeTransform {

  transform(phunk: Phunk): string {
    if (!phunk) return '';
    return environment.staticUrl + '/static/images/' + phunk.sha;
  }
}
