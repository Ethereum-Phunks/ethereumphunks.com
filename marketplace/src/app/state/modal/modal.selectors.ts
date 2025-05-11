import { createSelector } from '@ngrx/store';

import { GlobalState, ModalState } from '@/models/global-state';

export const selectModalState = (state: GlobalState) => state.modalState;

export const selectModalById = (modalId: string) => createSelector(
  selectModalState,
  (state) => state.activeModals[modalId]
);

export const selectIsModalOpen = (modalId: string) => createSelector(
  selectModalById(modalId),
  (modal) => modal?.isOpen ?? false
);
