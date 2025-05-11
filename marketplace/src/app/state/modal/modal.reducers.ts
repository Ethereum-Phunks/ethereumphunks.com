import { ModalState } from '@/models/global-state';
import { Action, ActionReducer, createReducer, on } from '@ngrx/store';
import { closeAllModals, closeModal } from '../modal/modal.actions';
import { openModal } from '../modal/modal.actions';

const initialState: ModalState = {
  activeModals: {}
};

export const modalReducer: ActionReducer<ModalState, Action> = createReducer(
  initialState,
  on(openModal, (state, { modalId, config }) => {
    return {
      ...state,
      activeModals: {
        ...state.activeModals,
        [modalId]: {
          isOpen: true,
          config
        }
      }
    };
  }),
  on(closeModal, (state, { modalId }) => {
    return {
      ...state,
      activeModals: {
        ...state.activeModals,
        [modalId]: {
          isOpen: false,
          config: null
        }
      }
    };
  }),
  on(closeAllModals, (state) => {
    return {
      ...state,
      activeModals: {}
    };
  })
);
