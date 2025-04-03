import { Component, input, OnDestroy, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';

import { TimeagoModule } from 'ngx-timeago';

import { Store } from '@ngrx/store';
import { firstValueFrom, switchMap, tap } from 'rxjs';

import { Collection } from '@/models/data.state';
import { GlobalState } from '@/models/global-state';
import { Notification } from '@/models/global-state';

import { Web3Service } from '@/services/web3.service';
import { DataService } from '@/services/data.service';
import { SocketService } from '@/services/socket.service';
import { UtilService } from '@/services/util.service';

import { TippyDirective } from '@/directives/tippy.directive';

import { selectConnected, selectWalletAddress } from '@/state/selectors/app-state.selectors';
import { upsertNotification } from '@/state/actions/notification.actions';

import { environment } from 'src/environments/environment';

import { MintRequestResponse } from './models/metadata';

interface MintState {
  activeMint: MintRequestResponse | null;
  mintProgress: number;
  loadingMint: boolean;
  inscribing: boolean;
  error: string | null;
  penaltyTimeout: boolean;
  retryAfter: number;
  transaction: {
    hash: string | null;
    status: 'wallet' | 'pending' | 'complete' | 'error' | null;
  } | null;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TippyDirective,

    TimeagoModule,
  ],
  selector: 'app-mint',
  templateUrl: './mint.component.html',
  styleUrl: './mint.component.scss'
})
export class MintComponent implements OnDestroy {

  baseUrl = environment.staticUrl;

  collection = input<Collection>();
  mintImage = output<string | null>();

  private readonly defaultState: MintState = {
    activeMint: null,
    mintProgress: 0,
    loadingMint: false,
    inscribing: false,
    error: null,
    penaltyTimeout: false,
    retryAfter: 0,
    transaction: null,
  };

  state = signal<MintState>(this.defaultState);

  connected$ = this.store.select(selectConnected);
  connectedAddress$ = this.store.select(selectWalletAddress);

  // pendingInscriptionShas$ = this.socketSvc.pendingInscriptionShas$;

  private timeoutInterval?: ReturnType<typeof setInterval>;

  constructor(
    private store: Store<GlobalState>,
    public web3Svc: Web3Service,
    private dataSvc: DataService,
    private socketSvc: SocketService,
    private utilSvc: UtilService,
  ) {
    toObservable(this.collection).pipe(
      switchMap((collection) => this.dataSvc.fetchMintProgress(collection!.slug)),
      // tap((progress) => console.log('progress', progress)),
      tap((progress) => this.updateState({ mintProgress: progress })),
    ).subscribe();
  }

  ngOnDestroy(): void {
    if (this.timeoutInterval) {
      clearInterval(this.timeoutInterval);
    }
  }

  /**
   * Fetches a random mint item from the collection
   * Updates state with the fetched item and its image
   */
  async getRandomMintItem(): Promise<void> {
    try {
      this.updateState({ activeMint: null, loadingMint: true, transaction: null });

      const address = await firstValueFrom(this.connectedAddress$);
      const url = `${environment.relayUrl}/mint/random`;
      const params = new URLSearchParams();
      params.set('slug', this.collection()?.slug ?? '');
      params.set('address', address ?? '');

      const response = await fetch(url + '?' + params.toString());
      const data = await response.json();
      if (data.error) throw data;

      // console.log(data);

      this.mintImage.emit(data.metadata.image);
      this.updateState({ activeMint: data });

    } catch (err: any) {
      console.log(err);

      if (err.penaltyTimeout) {
        this.setPenaltyTimeout(err.retryAfter);
      }

    } finally {
      this.updateState({ loadingMint: false });
    }
  }

  /**
   * Handles the inscription process for minting
   * Creates notifications and updates state throughout the process
   */
  async inscribe(): Promise<void> {

    this.updateState({ inscribing: true, error: null });

    const activeMint = this.state().activeMint;
    if (!activeMint?.metadata) return;

    let notification: Notification = {
      id: this.utilSvc.createIdFromString('mint' + activeMint?.metadata.sha),
      timestamp: Date.now(),
      type: 'wallet',
      function: 'mint',
      slug: activeMint?.slug,
      tokenId: activeMint?.id,
      sha: activeMint?.metadata.sha,
    };

    this.store.dispatch(upsertNotification({ notification }));
    this.updateState({ transaction: { hash: null, status: 'wallet' } });

    try {

      // if (!environment.production) {
      //   dataUri = `data:image/png;base64,${new Date().getTime()}`;
      // }

      const hash = await this.web3Svc.inscribe(activeMint.metadata.image);
      if (!hash) throw new Error('Failed to inscribe');

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
      this.updateState({ error: error as string, transaction: null });

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
      penaltyTimeout: false,
      retryAfter: 0,
      transaction: { hash: null, status: null },
    });
  }

  /**
   * Sets a penalty timeout for the user
   * @param retryAfter - The number of seconds to wait before allowing the user to mint again
   */
  setPenaltyTimeout(retryAfter: number): void {
    // Clear any existing timeout
    if (this.timeoutInterval) {
      clearInterval(this.timeoutInterval);
    }

    this.updateState({
      penaltyTimeout: true,
      retryAfter: Math.max(0, retryAfter)
    });

    this.timeoutInterval = setInterval(() => {
      const currentRetry = this.state().retryAfter;
      if (currentRetry <= 0) {
        clearInterval(this.timeoutInterval);
        this.updateState({ penaltyTimeout: false, retryAfter: 0 });
        return;
      }
      this.updateState({ retryAfter: currentRetry - 1 });
    }, 1000);
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
