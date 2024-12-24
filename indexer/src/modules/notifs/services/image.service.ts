import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

import { createCanvas, Image, registerFont } from 'canvas';

import { Collection, Ethscription } from '@/models/db';
import { catchError, firstValueFrom, of } from 'rxjs';
import { readFile } from 'fs/promises';
import path from 'path';

import { rarityData } from '../constants/collections';

/**
 * Service for generating notification images
 */
@Injectable()
export class ImageService {

  constructor(
    private readonly http: HttpService
  ) {}

  /**
   * Generates a notification image for a single ethscription
   * @param data Object containing ethscription, collection and attribute data
   * @param data.ethscription The ethscription details
   * @param data.collection The collection details
   * @param data.attributes Array of attribute objects with key, value and rarity
   * @returns Promise resolving to image buffer
   */
  async generateImage(data: {
    ethscription: Ethscription,
    collection: Collection,
    attributes: {
      k: string,
      v: string,
      rarity: number,
    }[],
  }): Promise<Buffer> {
    const canvasMax = 800;

    const canvasWidth = canvasMax;
    const canvasHeight = canvasMax;

    // Register custom font
    registerFont(path.join(__dirname, '../../../_static/retro-computer.ttf'), { family: 'RetroComputer' });

    // Define brand colors
    const colors = {
      base: '#C3FF00',
      pink: '#FF03B4',
      blue: '#00FFC9',
    };

    // Initialize canvas
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Draw base background
    ctx.fillStyle = colors.base;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const bottomBarPos = canvasHeight - 200;

    // Draw top bar
    ctx.fillStyle = colors.pink;
    ctx.fillRect(0, 0, canvasWidth, 20);

    // Draw bottom bar
    ctx.fillStyle = colors.pink;
    ctx.fillRect(0, bottomBarPos, canvasWidth, 200);

    // Draw collection name
    ctx.fillStyle = colors.base;
    ctx.font = 'bold 34px RetroComputer';
    ctx.fillText(data.collection.singleName, 25, bottomBarPos + 65);

    // Draw token ID
    ctx.fillStyle = colors.base;
    ctx.font = 'bold 100px RetroComputer';
    ctx.fillText(`${data.ethscription.tokenId}`, 20, canvasHeight - 35);

    // Draw rarity number
    ctx.fillStyle = colors.blue;
    ctx.font = 'bold 22px RetroComputer';
    const rarityNumberWidth = ctx.measureText(`${data.attributes[0].rarity}`).width;
    ctx.fillText(`${data.attributes[0].rarity}`, (canvasWidth - rarityNumberWidth) - 40, bottomBarPos + 65);

    // Draw rarity text line 1
    ctx.fillStyle = colors.base;
    ctx.font = 'bold 22px RetroComputer';
    const text = `One of`;
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, (canvasWidth - textWidth) - 40 - (rarityNumberWidth + 10), bottomBarPos + 65);

    // Draw rarity text line 2
    ctx.fillStyle = colors.blue;
    ctx.font = 'bold 22px RetroComputer';
    const text2 = `${data.attributes[0].v}`;
    const text2Width = ctx.measureText(text2).width;
    ctx.fillText(text2, (canvasWidth - text2Width) - 40, bottomBarPos + 95);

    // Draw rarity text line 3
    ctx.fillStyle = colors.base;
    ctx.font = 'bold 22px RetroComputer';
    const text3 = `${data.collection.singleName}s`;
    const text3Width = ctx.measureText(text3).width;
    ctx.fillText(text3, (canvasWidth - text3Width) - 40, bottomBarPos + 125);

    // Load and draw ethscription image
    const baseImageUrl = `https://kcbuycbhynlmsrvoegzp.supabase.co/storage/v1/object/public/images`;
    let image: ArrayBuffer | null = null;
    try {
      const response = await fetch(`${baseImageUrl}/${data.ethscription.sha}.png`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      image = await response.arrayBuffer();
    } catch (err) {
      Logger.error(err);
      image = null;
    }

    if (image) {
      const img = new Image();
      img.onload = () => {
        const x = canvasWidth / 4;
        const y = canvasHeight - bottomBarPos;
        ctx.drawImage(img, x, y, canvasWidth / 2, canvasHeight / 2);
      };
      img.onerror = err => { throw err };
      img.src = Buffer.from(image);
    }

    // Load and draw logo
    const logo = new Image();
    const logoSrc = path.join(__dirname, '../../../_static/eplogo.png');
    logo.onload = () => {
      ctx.drawImage(logo, 40, 60, 320, 65);
    };
    logo.onerror = err => { throw err };
    logo.src = Buffer.from(await readFile(logoSrc));
    const buffer = canvas.toBuffer('image/png');
    return buffer;
  }

  /**
   * Generates a grid image containing multiple ethscriptions
   * @param items Array of ethscriptions to include in the grid
   * @returns Promise resolving to image buffer
   */
  async generateImages(
    items: Ethscription[],
  ): Promise<Buffer> {
    const canvasMax = 1200;

    // Calculate grid dimensions
    let cols = Math.ceil(Math.sqrt(items.length));
    let rows = Math.ceil(items.length / cols);

    const canvasWidth = canvasMax;
    const canvasHeight = canvasMax * (rows / cols);

    // Initialize canvas
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Draw background
    ctx.fillStyle = '#C3FF00';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Load and draw each ethscription image
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
