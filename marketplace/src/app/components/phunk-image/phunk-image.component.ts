import { AfterViewInit, Component, ElementRef, Injector, ViewChild, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { hexToString } from 'viem';
import { catchError, firstValueFrom, of } from 'rxjs';

import { Phunk } from '@/models/db';
import { Web3Service } from '@/services/web3.service';
import { ImageService } from '@/services/image.service';

import { environment } from 'src/environments/environment';
type DecodedData = {
  type: 'text' | 'json' | 'html' | 'image' | 'video' | 'url' | 'unsupported';
  data: string;
};

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-phunk-image',
  templateUrl: './phunk-image.component.html',
  styleUrls: ['./phunk-image.component.scss'],
})
export class PhunkImageComponent {

  hashId = input<string>();
  color = input<boolean>(true);

  phunk = input<Phunk | null>();
  sha = input<string>();

  // imageData = input<string>();

  hashIdPrevValue!: string;
  colorPrevValue!: boolean;
  phunkPrevValue!: Phunk;

  phunkImgSrc!: string | null;
  phunkText!: string | null;
  decodedData!: DecodedData | null;

  constructor(
    private http: HttpClient,
    private web3Svc: Web3Service,
    private imageSvc: ImageService
  ) {

    effect(() => {
      // console.log('effect');

      if (this.hashId() && this.hashId() !== this.hashIdPrevValue) {
        // console.log('hashId changed', this.hashId());
        this.getPhunkByHashId(this.hashId()!);
      }

      if (this.phunk() && this.phunkPrevValue?.hashId !== this.phunk()?.hashId) {
        const phunk = this.phunk()!;

        this.phunkImgSrc = null;
        this.phunkText = null;
        this.decodedData = null;

        if (phunk.imageUri) {
          const decoded = this.decodeDataURI(phunk.imageUri!);
          this.decodedData = decoded;

          if (
            decoded.type === 'image' ||
            decoded.type === 'url'
          ) {
            this.phunkImgSrc = phunk.imageUri;
          } else if (
            decoded.type === 'text' ||
            decoded.type === 'json'
          ) {
            this.phunkText = decoded.data;
          } else {
            this.phunkText = 'Unsupported content type';
          }
        } else {
          // console.log('phunk.sha', phunk.sha);
          this.getPhunkImageBySha(phunk.sha);
        }
      }

      this.hashIdPrevValue = this.hashId()!;
      this.colorPrevValue = this.color()!;
      this.phunkPrevValue = this.phunk()!;
    });
  }

  /**
   * Fetches and processes an image by its SHA hash
   * @param sha SHA hash of the image to fetch
   * @returns Promise resolving to null if image fetch fails
   */
  async getPhunkImageBySha(sha: string): Promise<any> {
    const image = await this.imageSvc.fetchSupportedImageBySha(sha);
    if (!image) return null;
    const dataUri = `data:image/png;base64,${Buffer.from(image).toString('base64')}`;
    this.phunkImgSrc = dataUri;
  }

  /**
   * Fetches and processes a phunk by its transaction hash ID
   * @param hashId Transaction hash ID
   * @returns Promise resolving when image is processed
   */
  async getPhunkByHashId(hashId: string): Promise<any> {
    const tx = await this.web3Svc.getTransactionL1(hashId);
    const isDevMode = environment.chainId === 11155111;

    if (isDevMode && hexToString(tx.input).startsWith('data:application/phunky')) {
      this.getPhunkImageBySha(hexToString(tx.input).split(',')[1]);
    } else {
      this.phunkImgSrc = hexToString(tx.input);
    }
  }

  /**
   * Decodes a data URI into its component parts and determines content type
   * @param dataURI Data URI string to decode
   * @returns Object containing decoded type and data
   */
  decodeDataURI(dataURI: string): DecodedData {
    if (!dataURI) return { type: 'unsupported', data: 'No Data URI' };

    if (dataURI.startsWith('https://')) return { type: 'url', data: dataURI };

    const match = dataURI.match(/^data:([^;,]*)(;[^,]*)?,(.*)$/);
    if (!match) return { type: 'unsupported', data: 'Invalid Data URI' };

    const mimeType = match[1] || '';
    const parameters = match[2] || '';
    const isBase64 = parameters.includes('base64');
    let data = match[3];

    if (isBase64) {
      try {
        const binaryString = atob(data); // Decode base64 data
        const binaryLen = binaryString.length;
        const bytes = new Uint8Array(binaryLen);
        for (let i = 0; i < binaryLen; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        data = new TextDecoder().decode(bytes); // Decode bytes to string
      } catch (e) {
        return { type: 'unsupported', data: 'Error decoding base64 data' };
      }
    } else {
      data = decodeURIComponent(data); // Decode percent-encoded data
    }

    // Check if the data looks like JSON
    if (mimeType === 'application/json' || mimeType === '' || mimeType === 'text/plain') {
      try {
        const jsonData = JSON.parse(data);
        return { type: 'json', data: JSON.stringify(jsonData, null, 2) };
      } catch (e) {
        // Fall back to text if JSON parsing fails
        if (mimeType === 'application/json') {
          return { type: 'unsupported', data: 'Error parsing JSON' };
        }
      }
    }

    switch (mimeType) {
      case 'text/plain':
      case '':
        return { type: 'text', data };

      case 'text/html':
        let d: string;
        try {
          d = btoa(data);
          return { type: 'html', data: `data:text/html;base64,${btoa(data)}` };
        } catch (error) {
          return { type: 'unsupported', data: 'Error encoding HTML data' };
        }
      case 'image/png':
      case 'image/svg+xml':
      case 'image/jpg':
      case 'image/webp':
      case 'image/jpeg':
      case 'image/gif':
        return { type: 'image', data };

      case 'video/mp4':
      case 'video/webm':
        return { type: 'video', data: dataURI };

      default:
        return { type: 'unsupported', data: `Unsupported MIME type: ${mimeType}` };
    }
  }
}
