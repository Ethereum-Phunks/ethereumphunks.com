import { Component, Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

import { Observable, filter, map, take } from 'rxjs';
import { Store } from '@ngrx/store';

import { selectConfig } from '@/state/selectors/app-state.selectors';
import { GlobalState } from '@/models/global-state';

@Injectable({
  providedIn: 'root'
})
@Component({
  standalone: true,
  template: '',
})
export class InitialCollectionGuard implements CanActivate {

  constructor(
    private store: Store<GlobalState>,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.store.select(selectConfig).pipe(
      filter(config => !!config.defaultCollection),
      take(1),
      map(config => {
        const defaultSlug = config.defaultCollection;
        this.router.navigate([`/${defaultSlug}`]);
        return false;
      })
    );
  }
}
