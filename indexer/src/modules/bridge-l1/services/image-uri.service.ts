import { Injectable, Logger } from '@nestjs/common';

import { HttpService } from '@nestjs/axios';

import { catchError, firstValueFrom, of } from 'rxjs';

@Injectable()
export class ImageUriService {

  constructor(
    private readonly http: HttpService,
  ) {}

  async createImageUri(sha: string): Promise<string> {
    const baseImageUrl = `https://kcbuycbhynlmsrvoegzp.supabase.co/storage/v1/object/public/images`;
    const image = await firstValueFrom(
      this.http.get(`${baseImageUrl}/${sha}.png`, { responseType: 'arraybuffer' }).pipe(
        catchError(err => {
          Logger.error(err);
          return of(null);
        }),
      ),
    );

    const dataUri = `data:image/png;base64,${Buffer.from(image.data).toString('base64')}`;
    return dataUri;
  }
}
