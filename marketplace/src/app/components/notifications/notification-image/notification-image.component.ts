import { Component, effect, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { LazyLoadImageModule } from 'ng-lazyload-image';

import { hexToString } from 'viem';

import { Web3Service } from '@/services/web3.service';
import { ImageService } from '@/services/image.service';

import { environment } from 'src/environments/environment';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    LazyLoadImageModule,
  ],
  selector: 'app-notification-image',
  templateUrl: './notification-image.component.html',
  styleUrls: ['./notification-image.component.scss'],
})
export class NotificationImageComponent {

  hashId = input<string>();
  imageData = signal<string | null>(null);

  constructor(
    private http: HttpClient,
    private web3Svc: Web3Service,
    private imageSvc: ImageService
  ) {
    effect(async () => {
      const hashId = this.hashId();
      if (!hashId) return;

      untracked(async () => {
        const data = await this.getPhunkByHashId(hashId);
        this.imageData.set(data);
      });
    });
  }

  /**
   * Fetches and processes a phunk by its transaction hash ID
   * @param hashId Transaction hash ID
   * @returns Promise resolving when image is processed
   */
  async getPhunkByHashId(hashId: string): Promise<string> {
    const tx = await this.web3Svc.getTransactionL1(hashId);
    const isDevMode = environment.chainId === 11155111;

    // Use this for fake ethscriptions/testing (misprint mingos on sepolia)
    if (isDevMode && hexToString(tx.input).startsWith('data:application/phunky')) {
      const dataUri = await this.getPhunkImageBySha(hexToString(tx.input || tx.data).split(',')[1]);
      return dataUri;
    }

    return hexToString(tx.input || tx.data);
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
    this.imageData.set(dataUri);
  }
}
