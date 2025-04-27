import { Component, effect, ElementRef, input, viewChild } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';

import { LazyLoadImageModule } from 'ng-lazyload-image';

import { toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, from, map, Observable, of, startWith, switchMap } from 'rxjs';

import { Collection } from '@/models/data.state';

import { PixelArtService } from '@/services/pixel-art.service';
import { ImageService } from '@/services/image.service';

import { gsap } from 'gsap';
interface Image {
  src: string;
  type: 'loading' | 'mint' | 'gray';
}

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [
    CommonModule,
    LazyLoadImageModule,
    AsyncPipe
  ],
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss'],
})
export class SplashComponent {

  imagesWrapper = viewChild<ElementRef>('imagesWrapper');

  Array = Array;

  readonly IMAGE_LIMIT = 9;
  readonly MAX_IMAGE_SIZE = 2000;
  readonly defaultImage = { src: '/assets/loadingphunk.png', type: 'loading' };
  readonly defaultImages: Image[] = Array(this.IMAGE_LIMIT).fill(this.defaultImage);

  collection = input<Collection | null>();
  collection$ = toObservable(this.collection);

  mintImage = input<string | null>();
  mintImage$ = toObservable(this.mintImage);

  images$: Observable<Image[]> = this.collection$.pipe(
    distinctUntilChanged((prev, curr) => prev?.slug === curr?.slug),
    switchMap((collection) => {
      if (!collection) return of(this.defaultImages);
      const shas = collection.previews?.map(({ sha }) => sha);

      if (!shas?.length) return of(this.defaultImages);

      return from(this.createImageArray(shas)).pipe(
        switchMap((images) => {
          return this.mintImage$.pipe(
            map((mintImage) => {
              if (!mintImage || !collection.isMinting) return images;
              const newImages: Image[] = [...images];
              const centerIndex = Math.floor(this.IMAGE_LIMIT / 2);
              newImages[centerIndex] = {
                src: mintImage,
                type: 'mint'
              };
              return newImages;
            }),
          );
        }),
        startWith(this.defaultImages)
      );
    }),
  );

  constructor(
    private pixelArtSvc: PixelArtService,
    private imageSvc: ImageService
  ) {}

  // async formatImages(images: Image[]): Promise<Image[]> {
  //   const centerImageIndex = Math.floor(this.IMAGE_LIMIT / 2);

  //   if (images[centerImageIndex]?.type === 'mint') {
  //     const buffer = await fetch(images[centerImageIndex].src).then((res) => res.arrayBuffer());
  //     const pixelArtImage = await this.pixelArtSvc.processPixelArtImage(buffer);
  //     const svg = this.pixelArtSvc.convertToSvg(pixelArtImage);
  //     const newImage = this.pixelArtSvc.stripColors(svg);
  //     images[centerImageIndex] = {
  //       src: this.pixelArtSvc.convertToBase64(newImage),
  //       type: 'gray'
  //     };
  //   }

  //   return images;
  // }

  async animateMint() {
    const children = this.imagesWrapper()?.nativeElement.children;
    // console.log({children});
    if (!children) return;

    await gsap.to(children, {
      opacity: .1,
      duration: 0.5,
      ease: 'power2.inOut'
    });
  }

  /**
   * Creates an array of processed images from a list of SHA hashes
   *
   * @param shas - Array of SHA hashes identifying the images to fetch and process
   * @returns Promise that resolves when image processing is complete
   */
  async createImageArray(shas: string[]): Promise<Image[]> {
    if (!shas?.length) return [];

    const imageArray = [...this.defaultImages];
    let validImages = 0;
    let currentIndex = 0;

    // Keep processing until we have 9 valid images or run out of SHAs
    while (validImages < this.IMAGE_LIMIT && currentIndex < shas.length) {
      // Process next batch of images in parallel
      const batchSize = Math.min(5, shas.length - currentIndex);
      const batchPromises = shas.slice(currentIndex, currentIndex + batchSize).map(async (sha) => {
        try {
          const image = await this.imageSvc.fetchSupportedImageBySha(sha);
          if (image.byteLength > this.MAX_IMAGE_SIZE) return null;

          const pixels = await this.pixelArtSvc.processPixelArtImage(image);
          const svg = this.pixelArtSvc.convertToSvg(pixels);
          const stripped = this.pixelArtSvc.stripColors(svg);
          const base64 = this.pixelArtSvc.convertToBase64(stripped);

          return {
            src: base64,
            type: 'gray' as const
          };
        } catch (error) {
          console.error(`Error processing image ${sha}:`, error);
          return null;
        }
      });

      const results = await Promise.all(batchPromises);

      // Add valid results to our array
      for (const result of results) {
        if (result && validImages < this.IMAGE_LIMIT) {
          imageArray[validImages] = result;
          validImages++;
        }
      }

      currentIndex += batchSize;
    }

    return imageArray;
  }

  formatNumber(num: string): string | null {
    if (!num) return null;
    return String(num).padStart(4, '0');
  }

  async handleMintImage(mintImage: string, images: string[]) {
    const imagesWrapper = this.imagesWrapper()?.nativeElement;
    if (!imagesWrapper) return;

    let newImages = [...images];
    const centerImageIndex = Math.floor(this.IMAGE_LIMIT / 2); // 4th image
    const lastImage = newImages[newImages.length - 1];
    newImages.pop();

    newImages = [ lastImage, ...newImages ];
    newImages[centerImageIndex] = mintImage;

    // Process the mint image if it's a blob URL
    if (newImages[centerImageIndex + 1].startsWith('blob:')) {
      const buffer = await fetch(newImages[centerImageIndex + 1]).then((res) => res.arrayBuffer());
      const pixelArtImage = await this.pixelArtSvc.processPixelArtImage(buffer);
      const svg = this.pixelArtSvc.convertToSvg(pixelArtImage);
      const newImage = this.pixelArtSvc.stripColors(svg);
      newImages[centerImageIndex + 1] = this.pixelArtSvc.convertToBase64(newImage);
    }

    return newImages;
  }
}
