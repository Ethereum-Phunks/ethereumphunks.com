import { Component, effect, input, signal, untracked } from '@angular/core';
import { AsyncPipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';

import { Store } from '@ngrx/store';
import { GlobalState } from '@/models/global-state';
import * as appStateSelectors from '@/state/app/app-state.selectors';

import { GasService } from '@/services/gas.service';

import { combineLatest, firstValueFrom } from 'rxjs';

import { environment } from '@environments/environment';
import { setLogsActive } from '@/state/indexer-logs/indexer-logs.actions';
import { selectLogsActive } from '@/state/indexer-logs/indexer-logs.selectors';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [
    AsyncPipe,
    DecimalPipe,
    NgTemplateOutlet
  ],
  templateUrl: './status-bar.component.html',
  styleUrl: './status-bar.component.scss',
})
export class StatusBarComponent {

  blocks$ = combineLatest([
    this.store.select(appStateSelectors.selectCurrentBlock),
    this.store.select(appStateSelectors.selectIndexerBlock),
  ]);

  chain = environment.chainId;

  levels: any = {
    0: 'sync',
    1: 'behind1',
    2: 'behind2',
    3: 'behind3'
  };

  expanded$ = this.store.select(selectLogsActive);

  constructor(
    private store: Store<GlobalState>,
    public gasSvc: GasService
  ) {}

  async expandCollapse() {
    const expanded = await firstValueFrom(this.expanded$);
    this.store.dispatch(setLogsActive({ logsActive: !expanded }));
  }
}
