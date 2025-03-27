import { Component, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

import { Store } from '@ngrx/store';
import { firstValueFrom, switchMap, tap } from 'rxjs';

import { Collection } from '@/models/data.state';
import { GlobalState } from '@/models/global-state';

import { Web3Service } from '@/services/web3.service';
import { DataService } from '@/services/data.service';
import { SocketService } from '@/services/socket.service';

import { selectConnected, selectWalletAddress } from '@/state/selectors/app-state.selectors';

import { environment } from 'src/environments/environment';

import { upsertNotification } from '@/state/actions/notification.actions';
import { Notification } from '@/models/global-state';
import { UtilService } from '@/services/util.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { TippyDirective } from '@/directives/tippy.directive';
import { setConnected } from '@/state/actions/app-state.actions';
import { fromHex } from 'viem';

type MintItem = {
  slug: string;
  tokenId: number;
  imageUrl: string;
  exists: boolean;
  metadata: {
    sha: string;
    attributes: {
      [key: string]: string;
    }
  }
}

type MintState = {
  activeMint: MintItem | null;
  mintProgress: number;
  loadingMint: boolean;
  inscribing: boolean;
  error: string | null;
  transaction: {
    hash: string | null;
    status: 'wallet' | 'pending' | 'complete' | 'error' | null;
  };
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TippyDirective,
  ],
  selector: 'app-mint',
  templateUrl: './mint.component.html',
  styleUrl: './mint.component.scss'
})
export class MintComponent {

  baseUrl = environment.staticUrl;

  collection = input<Collection>();
  mintImage = output<string | null>();

  defaultState = {
    activeMint: null,
    mintProgress: 0,
    loadingMint: false,
    inscribing: false,
    error: null,
    transaction: { hash: null, status: null },
  }

  state = signal<MintState>(this.defaultState);

  connected$ = this.store.select(selectConnected);
  connectedAddress$ = this.store.select(selectWalletAddress);

  pendingInscriptionShas$ = this.socketSvc.pendingInscriptionShas$;

  constructor(
    private store: Store<GlobalState>,
    public web3Svc: Web3Service,
    private dataSvc: DataService,
    private socketSvc: SocketService,
    private utilSvc: UtilService,
  ) {
    toObservable(this.collection).pipe(
      switchMap((collection) => this.dataSvc.fetchMintProgress(collection!.slug)),
      tap((progress) => this.updateState({ mintProgress: progress })),
    ).subscribe();
  }

  /**
   * Fetches a random mint item from the collection
   * Updates state with the fetched item and its image
   */
  async getRandomMintItem(): Promise<any> {
    // try {
    //   this.updateState({ loadingMint: true });

    //   const address = await firstValueFrom(this.connectedAddress$);
    //   const url = `${environment.relayUrl}/mint/random`;
    //   const params = new URLSearchParams();
    //   params.set('slug', this.collection()?.slug ?? '');
    //   params.set('address', address ?? '');

    //   const response = await fetch(url + '?' + params.toString());
    //   const data = await response.json();

    //   console.log(data);

    //   if (data.error) throw data;

    //   // const dataUri = fromHex(data.metadata.imageData, 'string');
    //   // this.mintImage.emit(dataUri);

    //   this.updateState({ activeMint: data });
    //   this.updateState({ loadingMint: false });

    // } catch (error) {
    //   console.log(error);
    // }
  }

  /**
   * Fetches an image by SHA and converts it to a blob URL
   * @param sha SHA hash of the image to fetch
   * @returns Promise resolving to the blob URL of the image
   */
  async fetchImage(sha: string): Promise<string> {
    const imageResponse = await fetch(this.baseUrl + '/static/images/' + sha);
    const imageBlob = await imageResponse.blob();
    const imageUrl = URL.createObjectURL(imageBlob);
    return imageUrl;
  }

  /**
   * Handles the inscription process for minting
   * Creates notifications and updates state throughout the process
   */
  async inscribe(): Promise<void> {

    this.updateState({ inscribing: true, error: null });

    const activeMint = this.state().activeMint;
    const image = activeMint?.imageUrl;
    if (!image) return;

    let notification: Notification = {
      id: this.utilSvc.createIdFromString('mint' + activeMint?.metadata.sha),
      timestamp: Date.now(),
      type: 'wallet',
      function: 'mint',
      slug: activeMint?.slug,
      tokenId: activeMint?.tokenId,
      sha: activeMint?.metadata.sha,
    };

    this.store.dispatch(upsertNotification({ notification }));
    this.updateState({ transaction: { hash: null, status: 'wallet' } });

    try {
      let base64Image = await this.blobUrlToBase64(image);

      if (!environment.production) {
        base64Image = `data:image/png;base64,${new Date().getTime()}`;
      }

      const hash = await this.web3Svc.inscribe(base64Image);
      this.updateState({ transaction: { hash, status: 'pending' } });

      this.store.dispatch(upsertNotification({ notification }));

      notification = {
        ...notification,
        type: 'pending',
        hash,
      };

      this.store.dispatch(upsertNotification({ notification }));

      const receipt = await this.web3Svc.pollReceipt(hash!);
      this.updateState({ transaction: { hash, status: 'complete' } });

      notification = {
        ...notification,
        type: 'complete',
        hash: receipt.transactionHash,
      };

    } catch (error) {
      console.log(error);
      this.updateState({ error: error as string, transaction: { hash: null, status: null } });

      notification = {
        ...notification,
        type: 'error',
        detail: error,
      };
    } finally {
      this.store.dispatch(upsertNotification({ notification }));
      this.updateState({ inscribing: false });
    }
  }

  /**
   * Updates the component state with partial updates
   * @param updates Partial state updates to apply
   */
  updateState(updates: Partial<MintState>): void {
    const activeState = this.state();
    this.state.set({ ...activeState, ...updates });
  }

  /**
   * Resets the component state to default values
   */
  resetState(): void {
    this.state.set({
      activeMint: null,
      mintProgress: 0,
      loadingMint: false,
      inscribing: false,
      error: null,
      transaction: { hash: null, status: null },
    });
  }

  /**
   * Converts a blob URL to a base64 string
   * @param blobUrl URL of the blob to convert
   * @returns Promise resolving to the base64 string
   */
  async blobUrlToBase64(blobUrl: string): Promise<string> {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    const image = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(blob);
    });
    return image;
  }

  connect(): void {
    this.web3Svc.connect();
  }
}
