import { createAction } from '@ngrx/store';
import { props } from '@ngrx/store';

export const openModal = createAction(
  '[Modal State] Open Modal',
  props<{
    modalId: string;
    config?: any;
  }>()
);

export const closeModal = createAction(
  '[Modal State] Close Modal',
  props<{ modalId: string }>()
);

export const closeAllModals = createAction(
  '[Modal State] Close All Modals'
);
