import { Component, DestroyRef, effect, input, Input, OnChanges, OnDestroy, signal, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { computedPrevious } from 'ngxtension/computed-previous';

import { LazyLoadImageModule } from 'ng-lazyload-image';

import { Collection } from '@/models/data.state';

import { PhunkImageComponent } from '../shared/phunk-image/phunk-image.component';

import { INode, parse, stringify } from 'svgson';
import tinycolor from 'tinycolor2';

import { catchError, filter, firstValueFrom, from, map, of, switchMap, tap } from 'rxjs';

import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [
    CommonModule,
    LazyLoadImageModule,

    PhunkImageComponent
  ],
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss'],
})
export class SplashComponent implements OnChanges {

  collection = input<Collection | null>();
  collectionPrev = computedPrevious(this.collection);

  random = signal<string[]>([]);
  images = signal<string[]>([]);

  constructor(
    private http: HttpClient
  ) {
    effect(async () => {
      console.log('effect', this.collection(), this.collectionPrev())
      if (!this.collection()) return;
      this.images.set(await this.getPixelsFromPng());
    })
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
  //   if (
  //     changes.collection &&
  //     changes.collection.currentValue &&
  //     changes.collection.currentValue.slug === 'ethereum-phunks' &&
  //     changes.collection.currentValue.slug !== changes.collection.previousValue?.slug
  //   ) {
  //     console.log('SLUG CHANGED');
  //     const random = this.getRandomNumbers();
  //     const images = await Promise.all(random.map(num => this.getPhunkByTokenId(num)));
  //     this.random.set(random);
  //     this.images.set(images);
  //   } else {
  //     this.random.set([]);
  //     this.images.set([]);
  //   }
  }

  async getPixelsFromPng(): Promise<any> {
    if (!this.collection()?.previews?.length) return [];

    const baseImageUrl = `${environment.staticUrl}/images`;

    const imageArray = await Promise.all(
      this.collection()!.previews.map(({ sha }) => {
        // console.log(sha);

        const url = `${baseImageUrl}/${sha}.png`;

        return firstValueFrom(
          this.http.get(url, { responseType: 'arraybuffer' }).pipe(
            switchMap((data) => from(this.processPixelArtImage(data))),
            map((data) => this.convertToSvg(data)),
            map((data) => this.stripColors(data)),
            map((data) => this.convertToBase64(data)),
            catchError((err) => {
              console.error(err);
              return of(null);
            })
          )
        );
      })
    );
    return imageArray;
  }

  private async processPixelArtImage(buffer: ArrayBuffer): Promise<string[][]> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([buffer], { type: 'image/png' });
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Unable to get 2D context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const pixelArtData = this.convertToPixelArtFormat(imageData);
        resolve(pixelArtData);
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(blob);
    });
  }

  private convertToPixelArtFormat(imageData: ImageData): string[][] {
    const { width, height, data } = imageData;
    const pixelArtData: string[][] = [];

    for (let y = 0; y < height; y++) {
      const row: string[] = [];
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];
        const colorCode = this.rgbaToHex(r, g, b, a);
        row.push(colorCode);
      }
      pixelArtData.push(row);
    }

    return pixelArtData;
  }

  private rgbaToHex(r: number, g: number, b: number, a: number): string {
    const toHex = (value: number) => {
      const hex = value.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
  }

  private convertToSvg(arr: string[][]): INode {
    const width = arr[0].length;
    const height = arr.length;

    const svg: INode = {
      name: 'svg',
      type: 'element',
      attributes: {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: `0 0 ${width} ${height}`,
        width: `${width}`,
        height: `${height}`,
      },
      children: [],
      value: ''
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = arr[y][x];
        if (color === '00000000') continue;

        // console.log({x, y, width, height, color});
        const rect: INode = {
          name: 'rect',
          type: 'element',
          attributes: {
            x: `${x}`,
            y: `${y}`,
            width: '1',
            height: '1',
            fill: `#${color}`,
            'shape-rendering': 'crispEdges',
          },
          children: [],
          value: ''
        };
        svg.children.push(rect);
      }
    }

    return svg;
  }

  convertToBase64(node: INode): string {
    const string = stringify(node);
    const base64 = btoa(string);
    return `data:image/svg+xml;base64,${base64}`;
  }

  getRandomNumbers(): string[] {
    const numbers: Set<string> = new Set();
    while (numbers.size < 7) {
      const random = Math.floor(Math.random() * 10000);
      const formatted = String(random).padStart(4, '0');
      numbers.add(formatted);
    }
    return [...numbers];
  }

  formatNumber(num: string): string | null {
    if (!num) return null;
    return String(num).padStart(4, '0');
  }

  async getPhunkByTokenId(tokenId: string): Promise<any> {
    const url = `https://punkcdn.com/data/images/phunk${('000' + tokenId).slice(-4)}.svg`;

    return await firstValueFrom(
      this.http.get(url, { responseType: 'text' }).pipe(
        filter((data): data is string => !!data),
        switchMap(data => from(parse(data))),
        map(data => this.stripColors(data)),
        map(data => this.convertToBase64(data)),
        catchError((err) => {
          console.error(err);
          return of(null);
        })
      )
    );
  }

  stripColors(node: INode): INode {
    const colorMap: Record<string, number> = {};

    for (const child of node.children) {
      if (child.name === 'rect' && child.attributes?.fill) {
        const color = tinycolor(child.attributes.fill);
        const alpha = (tinycolor(color).getBrightness() / 255);
        const opaque = tinycolor({ r: 0, g: 0, b: 0, a: (1 - alpha) });

        // console.log({color, alpha});

        const filter = [
          '#ffffffff', // White
          '#ead9d9ff', // Albino Skin Tone
          '#dbb180ff', // Light Skin Tone
          '#ae8b61ff', // Mid Skin Tone
          '#713f1dff', // Dark Skin Tone
          '#7da269ff', // Zombie Skin Tone
          '#352410ff', // Ape Skin Tone
          '#c8fbfbff', // Alien Skin Tone

          '#79a4f9ff', // Mingos background
        ];

        colorMap[child.attributes.fill] = (colorMap[child.attributes.fill] || 0) + 1;

        // Remove Skin Tone
        if (filter.indexOf(child.attributes.fill) > -1) child.attributes.fill = '#00000000';
        // Remove Transparent
        else if (child.attributes.fill === '#000000ff') continue;
        else child.attributes.fill = opaque.toString('hex8');
      }
    }

    // console.log(colorMap);
    return node;
  }
}
