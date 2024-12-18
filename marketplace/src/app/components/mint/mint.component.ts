import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';

import { Collection } from '@/models/data.state';

import { Web3Service } from '@/services/web3.service';
import { DataService } from '@/services/data.service';
import { GlobalState } from '@/models/global-state';

import { selectConnected, selectWalletAddress } from '@/state/selectors/app-state.selectors';
import { environment } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';

type MintItem = {
  slug: string;
  tokenId: number;
  imageUri: string;
  metadata: {
    sha: string;
    attributes: {
      [key: string]: string;
    }
  }
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  selector: 'app-mint',
  templateUrl: './mint.component.html',
  styleUrl: './mint.component.scss'
})
export class MintComponent {

  collection = input<Collection>();

  tokenId: FormControl = new FormControl<number | null>(null);

  activeMint = signal<MintItem | null>(null);
  loadingMint = signal(false);
  inscribing = signal(false)
  error = signal<string | null>(null);

  transaction = signal<any>({ hash: null, status: null });

  connected$ = this.store.select(selectConnected);
  connectedAddress$ = this.store.select(selectWalletAddress);

  constructor(
    private store: Store<GlobalState>,
    public web3Svc: Web3Service,
    private dataSvc: DataService,
  ) {}

  inscribe(): void {
    console.log('inscribe');
  }

  resetState(): void {
    this.activeMint.set(null);
    this.loadingMint.set(false);
    this.inscribing.set(false);
    this.error.set(null);
    this.transaction.set({ hash: null, status: null });
  }

  async randomMintItem(): Promise<any> {

    const address = await firstValueFrom(this.connectedAddress$);
    const url = `${environment.relayUrl}/mint/random`;
    const params = new URLSearchParams();
    params.set('slug', this.collection()?.slug ?? '');
    params.set('address', address ?? '');

    const response = await fetch(url + '?' + params.toString());
    const data = await response.json();
    console.log(data);
    // this.activeMint.set(data);
  }
}
