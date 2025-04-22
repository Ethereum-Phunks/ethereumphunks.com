import { Component, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap, tap } from 'rxjs';

import { Collection } from '@/models/data.state';

import { DataService } from '@/services/data.service';

@Component({
  standalone: true,
  selector: 'app-stats',
  imports: [
    CommonModule,
  ],
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss']
})
export class StatsComponent {

  collection = input<Collection | null>();
  stats$ = toObservable(this.collection).pipe(
    switchMap((collection) => this.dataSvc.fetchStats(collection?.slug || '')),
    tap((stats) => console.log('stats', stats)),
  );

  constructor(
    private dataSvc: DataService
  ) {
    effect(() => {
      console.log(this.collection());
    });
  }

}
