import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { Store } from '@ngrx/store';
import { filter, switchMap, tap } from 'rxjs';

import { GlobalState } from '@/models/global-state';
import { selectModalById, selectIsModalOpen } from '@/state/modal/modal.selectors';
import { closeModal } from '@/state/modal/modal.actions';

@Component({
  standalone: true,
  imports: [
    CommonModule
  ],
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  host: {
    '[class.active]': 'isOpen()'
  }
})
export class ModalComponent {

  modalId = input.required<string>();
  modalId$ = toObservable(this.modalId);

  preventBackdropClose = input<boolean>(false);

  isOpen$ = this.modalId$.pipe(
    filter((id: string) => !!id),
    switchMap((id: string) => this.store.select(selectIsModalOpen(id))),
    tap((isOpen: boolean) => console.log({isOpen})),
  );
  isOpen = toSignal(this.isOpen$);

  modalConfig$ = this.modalId$.pipe(
    filter((id: string) => !!id),
    switchMap((id: string) => this.store.select(selectModalById(id))),
    tap((config) => console.log({config})),
  );
  modalConfig = toSignal(this.modalConfig$);

  constructor(
    private store: Store<GlobalState>
  ) {}

  close(): void {
    this.store.dispatch(closeModal({ modalId: this.modalId() }));
  }
}
