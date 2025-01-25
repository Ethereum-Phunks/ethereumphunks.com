import { Component, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

import { Store } from '@ngrx/store';
import { firstValueFrom, tap } from 'rxjs';

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

  baseUrl = environment.staticUrl;

  collection = input<Collection>();
  mintImage = output<string | null>();

  activeMint = signal<MintItem | null>(null);
  mintProgress = signal<number>(0);

  loadingMint = signal(false);
  inscribing = signal(false)
  error = signal<string | null>(null);
  transaction = signal<any>({ hash: null, status: null });

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
    effect(() => {
      if (!this.collection()) return;
      this.dataSvc.fetchMintProgress(this.collection()!.slug).subscribe((progress) => {
        this.mintProgress.set(progress);
      });
    }, { allowSignalWrites: true });
  }

  resetState(): void {
    this.activeMint.set(null);
    this.loadingMint.set(false);
    this.inscribing.set(false);
    this.error.set(null);
    this.transaction.set({ hash: null, status: null });
  }

  async randomMintItem(): Promise<any> {
    this.loadingMint.set(true);

    const address = await firstValueFrom(this.connectedAddress$);
    const url = `${environment.relayUrl}/mint/random`;
    const params = new URLSearchParams();
    params.set('slug', this.collection()?.slug ?? '');
    params.set('address', address ?? '');

    const response = await fetch(url + '?' + params.toString());
    const data = await response.json();

    // fetch the image
    const imageResponse = await fetch(this.baseUrl + '/static/images/' + data.metadata.sha);
    const imageBlob = await imageResponse.blob();
    const imageUrl = URL.createObjectURL(imageBlob);

    data.imageUrl = imageUrl;

    this.activeMint.set(data);
    this.loadingMint.set(false);

    this.mintImage.emit(data.imageUrl);
    console.log(data);
  }

  async inscribe(): Promise<void> {
    this.inscribing.set(true);

    const image = this.activeMint()?.imageUrl;
    if (!image) return;

    let notification: Notification = {
      id: this.utilSvc.createIdFromString('mint' + this.activeMint()?.metadata.sha),
      timestamp: Date.now(),
      type: 'wallet',
      function: 'mint',
      slug: this.activeMint()?.slug,
      tokenId: this.activeMint()?.tokenId,
      sha: this.activeMint()?.metadata.sha,
    };

    this.store.dispatch(upsertNotification({ notification }));

    try {
      const base64Image = await this.blobUrlToBase64(image);
      const hash = await this.web3Svc.inscribe(base64Image);

      this.store.dispatch(upsertNotification({ notification }));

      notification = {
        ...notification,
        type: 'pending',
        hash,
      };

      this.store.dispatch(upsertNotification({ notification }));

      const receipt = await this.web3Svc.pollReceipt(hash!);

      notification = {
        ...notification,
        type: 'complete',
        hash: receipt.transactionHash,
      };
      // this.store.dispatch(appStateActions.addCooldown({ cooldown: { [hashId]: Number(receipt.blockNumber) }}))

    } catch (error) {
      console.log(error);
      this.error.set(error as string);

      notification = {
        ...notification,
        type: 'error',
        detail: error,
      };
    } finally {
      this.store.dispatch(upsertNotification({ notification }));
      this.inscribing.set(false);
    }
  }



  // async submitListing(phunk: Phunk): Promise<void> {

  //   const hashId = phunk.hashId;

  //   if (!hashId) throw new Error('Invalid hashId');
  //   if (!this.listPrice.value) return;

  //   const value = this.listPrice.value;
  //   // const revShare = (this.revShare.value || 0) * 1000;
  //   let address = this.listToAddress.value || undefined;

  //   // console.log({hashId, value, address});

  //   this.store.dispatch(upsertNotification({ notification }));

  //   try {
  //     await this.checkConsenus(phunk);

  //     if (address) {
  //       if (address?.endsWith('.eth')) {
  //         const ensOwner = await this.web3Svc.getEnsOwner(address);
  //         if (!ensOwner) throw new Error('ENS name not registered');
  //         address = ensOwner;
  //       }
  //       const validAddress = this.web3Svc.verifyAddress(address);
  //       if (!validAddress) throw new Error('Invalid address');
  //     }

  //     let hash;
  //     if (phunk.isEscrowed) {
  //       hash = await this.web3Svc.offerPhunkForSale(hashId, value, address);
  //     } else if (phunk.nft) {
  //       hash = await this.web3Svc.offerPhunkForSaleL2(hashId, value, address);
  //     } else {
  //       hash = await this.web3Svc.escrowAndOfferPhunkForSale(hashId, value, address);
  //     }

  //     // this.initNotificationMessage();
  //     this.store.dispatch(upsertNotification({ notification }));

  //     notification = {
  //       ...notification,
  //       type: 'pending',
  //       hash,
  //     };

  //     this.store.dispatch(upsertNotification({ notification }));

  //     const receipt = await this.web3Svc.pollReceipt(hash!);

  //     notification = {
  //       ...notification,
  //       type: 'complete',
  //       hash: receipt.transactionHash,
  //     };
  //     this.store.dispatch(appStateActions.addCooldown({ cooldown: { [hashId]: Number(receipt.blockNumber) }}));
  //   } catch (err) {
  //     console.log(err);

  //     notification = {
  //       ...notification,
  //       type: 'error',
  //       detail: err,
  //     };
  //   } finally {
  //     this.store.dispatch(upsertNotification({ notification }));
  //     this.clearAll();
  //   }
  // }

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
}
