import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

import { createCanvas, Image } from 'canvas';

import { Ethscription } from '@/models/db';
import { catchError, firstValueFrom, of } from 'rxjs';

@Injectable()
export class ImageService {

  constructor(
    private readonly http: HttpService
  ) {}

  async generateImage(
    items: Ethscription[],
  ): Promise<Buffer> {
    const canvasMax = 1200;

    let cols = Math.ceil(Math.sqrt(items.length));
    let rows = Math.ceil(items.length / cols);

    const canvasWidth = canvasMax;
    const canvasHeight = canvasMax * (rows / cols);

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#C3FF00';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const baseImageUrl = `https://kcbuycbhynlmsrvoegzp.supabase.co/storage/v1/object/public/images`;
    for (let i = 0; i < items.length; i++) {
      const phunk = items[i];

      const image = await firstValueFrom(
        this.http.get(`${baseImageUrl}/${phunk.sha}.png`, { responseType: 'arraybuffer' }).pipe(
          catchError(err => {
            Logger.error(err);
            return of(null);
          }),
        ),
      );

      if (image) {
        const img = new Image();
        img.onload = () => {
          const x = (i % cols) * (canvasWidth / cols);
          const y = Math.floor(i / cols) * (canvasHeight / rows);
          ctx.drawImage(img, x, y, canvasWidth / cols, canvasHeight / rows);
        };
        img.onerror = err => { throw err };
        img.src = Buffer.from(image.data);
      }
    }

    const buffer = canvas.toBuffer('image/png');
    return buffer;
  }
}
