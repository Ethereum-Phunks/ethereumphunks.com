import { Component, effect, ElementRef, input, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { LazyLoadImageModule } from 'ng-lazyload-image';

import { Collection } from '@/models/data.state';

import anime from 'animejs';

import { catchError, filter, firstValueFrom, from, map, of, switchMap, Observable, throwError, retry } from 'rxjs';

import { environment } from 'src/environments/environment';
import { PixelArtService } from '@/services/pixel-art.service';

const IMAGE_LIMIT = 9;
// Define a size threshold (in bytes) for what's considered a "large" image
const MAX_IMAGE_SIZE = 500000; // 500KB
// Maximum number of retry attempts
const MAX_RETRY_ATTEMPTS = 3;

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [
    CommonModule,
    LazyLoadImageModule
  ],
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss'],
})
export class SplashComponent {

  imagesWrapper = viewChild<ElementRef>('imagesWrapper');

  collection = input<Collection | null>();

  mintImage = input<string | null>();

  images: string[] = [];

  constructor(
    private http: HttpClient,
    private pixelArtSvc: PixelArtService
  ) {
    effect(async () => {
      const collection = this.collection();
      if (!collection) return;

      const images = await this.createImageArray(collection.previews?.map(({ sha }) => sha) || []);
      this.images = images.slice(0, IMAGE_LIMIT);
    });

    effect(async () => {
      const mintImage = this.mintImage();
      console.log(mintImage);
      if (!mintImage) return;

      const imagesWrapper = this.imagesWrapper()?.nativeElement;
      if (!imagesWrapper) return;

      const centerImageIndex = Math.floor(IMAGE_LIMIT / 2);
      console.log(centerImageIndex);

      // Create a new array with the last image moved to the front
      // and the mint image in the center position
      const newImages = [
        this.images[this.images.length - 1],  // Move last image to front
        ...this.images.slice(0, centerImageIndex - 1),  // Add images up to before center
        mintImage,  // Add mint image in center
        ...this.images.slice(centerImageIndex, IMAGE_LIMIT - 1)  // Add remaining images
      ];

      console.log(newImages);

      // Process the mint image if it's a blob URL
      if (newImages[centerImageIndex].startsWith('blob:')) {
        const buffer = await fetch(newImages[centerImageIndex]).then((res) => res.arrayBuffer());
        const pixelArtImage = await this.pixelArtSvc.processPixelArtImage(buffer);
        const svg = this.pixelArtSvc.convertToSvg(pixelArtImage);
        const newImage = this.pixelArtSvc.stripColors(svg);
        newImages[centerImageIndex] = this.pixelArtSvc.convertToBase64(newImage);
      }

      this.images = newImages;
      console.log(this.images);

      const animation = anime
        .timeline()
        .add({
          targets: imagesWrapper,
          translateX: [0, 320],
          duration: 250,
          easing: 'easeInOutSine',
        })
        .add({
          targets: Array.from(imagesWrapper.children).filter((_, i) => i !== (centerImageIndex - 1)),
          opacity: 0.35,
          duration: 250,
          easing: 'easeInOutSine',
        });

      await animation.finished;
    });
  }

  async createImageArray(shas: string[]): Promise<string[]> {
    if (!shas?.length) return [];

    console.log(shas);

    const baseImageUrl = `${environment.staticUrl}/static/images`;
    const imageArray = await Promise.all(
      shas.map((sha) => {
        const url = `${baseImageUrl}/${sha}`;

        return firstValueFrom(
          this.http.get(url, { responseType: 'arraybuffer' }).pipe(
            switchMap((data: ArrayBuffer) => {
              // Check if the image is too large
              if (data.byteLength > MAX_IMAGE_SIZE) {
                console.warn(`Image ${sha} is too large (${data.byteLength} bytes), retrying...`);
                return throwError(() => new Error('IMAGE_TOO_LARGE'));
              }
              return from(this.pixelArtSvc.processPixelArtImage(data));
            }),
            // Simple retry mechanism - will retry the entire pipeline up to MAX_RETRY_ATTEMPTS times
            retry(MAX_RETRY_ATTEMPTS),
            map((data) => this.pixelArtSvc.convertToSvg(data)),
            map((data) => this.pixelArtSvc.stripColors(data)),
            map((data) => this.pixelArtSvc.convertToBase64(data)),
            catchError((err) => {
              console.error(`Error processing image ${sha}:`, err);
              return of(null);
            })
          )
        );
      })
    );
    return imageArray.filter((image): image is string => !!image);
  }

  formatNumber(num: string): string | null {
    if (!num) return null;
    return String(num).padStart(4, '0');
  }
}
