import { Component, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { Web3Service } from '@/services/web3.service';

import { hexToString } from 'viem';
import { catchError, firstValueFrom, of } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-phunk-image',
  templateUrl: './phunk-image.component.html',
  styleUrls: ['./phunk-image.component.scss']
})
export class PhunkImageComponent {

  hashId = input<string>();
  sha = input<string>();
  tokenId = input<number>();
  color = input<boolean>(true);

  hashIdPrevValue!: string;
  shaPrevValue!: string;
  tokenIdPrevValue!: number;
  colorPrevValue!: boolean;

  phunkImgSrc!: string | null;

  constructor(
    private http: HttpClient,
    private web3Svc: Web3Service,
  ) {

    effect(() => {
      if (this.hashId() && this.hashId() !== this.hashIdPrevValue) {
        this.getPhunkByHashId(this.hashId()!);
      }

      if (this.sha() && this.sha() !== this.shaPrevValue) {
        this.getPhunkBySha(this.sha()!);
      }

      this.hashIdPrevValue = this.hashId()!;
      this.shaPrevValue = this.sha()!;
      this.tokenIdPrevValue = this.tokenId()!;
      this.colorPrevValue = this.color()!;
    });
  }

  async getPhunkBySha(sha: string): Promise<any> {
    const baseImageUrl = `${environment.staticUrl}/images`;
    const image = await firstValueFrom(
      this.http.get(`${baseImageUrl}/${sha}.png`, { responseType: 'arraybuffer' }).pipe(
        catchError(err => {
          console.error(err);
          return of(null);
        }),
      ),
    );

    if (!image) return null;
    const dataUri = `data:image/png;base64,${Buffer.from(image).toString('base64')}`;
    this.phunkImgSrc = dataUri;
  }

  async getPhunkByHashId(hashId: string): Promise<any> {
    const tx = await this.web3Svc.getTransaction(hashId);
    this.phunkImgSrc = hexToString(tx.input);
  }
}
