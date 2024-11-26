import { Component, effect, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { CommonModule, Location } from '@angular/common';

import { Store } from '@ngrx/store';
import { NgSelectModule } from '@ng-select/ng-select';

import { DataService } from '@/services/data.service';
import { GlobalState } from '@/models/global-state';

import { setActiveTraitFilters } from '@/state/actions/market-state.actions';
import { selectActiveTraitFilters } from '@/state/selectors/market-state.selectors';

import { Subject, switchMap, tap } from 'rxjs';

import { filterData } from '@/constants/collections';

@Component({
  selector: 'app-market-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgSelectModule
  ],
  templateUrl: './market-filters.component.html',
  styleUrls: ['./market-filters.component.scss']
})

export class MarketFiltersComponent {

  slug = input.required<string | undefined>();

  filterData: any = {};
  traitCount!: number;
  objectKeys = Object.keys;

  activeFiltersModel: any = {};
  activeTraitFilters$ = this.store.select(selectActiveTraitFilters).pipe(
    tap((filters) => this.activeFiltersModel = { ...filters }),
  );

  constructor(
    private store: Store<GlobalState>,
    public dataSvc: DataService,
    private location: Location,
  ) {
    effect(() => {
      if (!this.slug()) return;
      this.filterData = filterData[this.slug()!];
    });
  }

  selectFilter($event: any, key: string): void {
    const filters = { ...this.activeFiltersModel };
    let urlParams = new HttpParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key] === null) delete filters[key];
      if (filters[key]) urlParams = urlParams.append(key, filters[key]);
    });

    this.location.go(this.location.path().split('?')[0], urlParams.toString());
    this.store.dispatch(setActiveTraitFilters({ traitFilters: { ...filters } }));
  }

}
