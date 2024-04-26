import { Component } from '@angular/core';
import { AsyncPipe, JsonPipe, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterModule, RouterOutlet } from '@angular/router';

import { Store } from '@ngrx/store';
import { GlobalState } from '@/models/global-state';

import * as dataStateSelectors from '@/state/selectors/data-state.selectors';

import * as appStateSelectors from '@/state/selectors/app-state.selectors';
import * as appStateActions from '@/state/actions/app-state.actions';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  imports: [
    AsyncPipe,
    JsonPipe,
    NgTemplateOutlet,
    RouterModule,
  ],
  selector: 'app-collections-dropdown',
  templateUrl: './collections-dropdown.component.html',
  styleUrl: './collections-dropdown.component.scss'
})
export class CollectionsDropdownComponent {

  collections$ = this.store.select(dataStateSelectors.selectCollectionsWithAssets);
  activeCollection$ = this.store.select(dataStateSelectors.selectActiveCollection);
  dropdownActive$ = this.store.select(appStateSelectors.selectCollectionsMenuActive);

  constructor(
    private store: Store<GlobalState>,
    public route: ActivatedRoute,
    public router: Router
  ) {}

  async toggleDropdown(): Promise<void> {
    const isActive = await firstValueFrom(
      this.store.select(appStateSelectors.selectCollectionsMenuActive)
    );
    this.store.dispatch(appStateActions.setCollectionsMenuActive({ collectionsMenuActive: !isActive }));
  }
}
