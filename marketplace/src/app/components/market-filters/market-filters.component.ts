import { Component, effect, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { CommonModule, Location } from '@angular/common';

import { Store } from '@ngrx/store';
import { NgSelectModule } from '@ng-select/ng-select';

import { DataService } from '@/services/data.service';
import { IsNumberPipe } from '@/pipes/is-number';
import { GlobalState } from '@/models/global-state';

import { setActiveTraitFilters } from '@/state/actions/market-state.actions';
import { selectActiveTraitFilters } from '@/state/selectors/market-state.selectors';

import { tap } from 'rxjs';
@Component({
  selector: 'app-market-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgSelectModule,
    IsNumberPipe
  ],
  templateUrl: './market-filters.component.html',
  styleUrls: ['./market-filters.component.scss']
})

export class MarketFiltersComponent {

  slug = input.required<string | undefined>();

  filterData: { [key: string]: string[] | number[] } = {};
  traitCount!: number;
  objectKeys = Object.keys;

  activeTraitFilters: any = {};
  activeTraitFilters$ = this.store.select(selectActiveTraitFilters).pipe(
    tap((filters) => this.activeTraitFilters = { ...filters }),
  );

  constructor(
    private store: Store<GlobalState>,
    public dataSvc: DataService,
    private location: Location,
  ) {
    effect(async () => {
      const slug = this.slug();
      if (!slug) return;
      const filters = await this.dataSvc.getFilters(slug);
      this.filterData = filters || {};
    });
  }

  selectFilter($event: any): void {
    const filters = { ...this.activeTraitFilters };
    let urlParams = new HttpParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key] === null) delete filters[key];
      if (filters[key]) urlParams = urlParams.append(key, filters[key]);
    });

    this.location.go(this.location.path().split('?')[0], urlParams.toString());
    this.store.dispatch(setActiveTraitFilters({ traitFilters: { ...filters } }));
  }

}
