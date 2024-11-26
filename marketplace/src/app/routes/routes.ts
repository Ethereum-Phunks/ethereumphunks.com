import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@/routes/index/index.component').then(mod => mod.IndexComponent),
  },
  {
    path: 'curated/:slug',
    redirectTo: ({ params, queryParams, url, fragment }) => {
      if (url.length === 2 && params['slug'] === 'ethereum-phunks') return '/';
      return url.join('/');
    },
  },
  {
    path: 'market/:marketType',
    loadComponent: () => import('@/routes/market/market.component').then(mod => mod.MarketComponent)
  },
  {
    path: 'details/:tokenId',
    loadComponent: () => import('@/routes/item-view/item-view.component').then(mod => mod.ItemViewComponent)
  },
  {
    path: 'curated/:slug',
    loadComponent: () => import('@/routes/index/index.component').then(mod => mod.IndexComponent)
  },
  {
    path: 'curated/:slug/market/:marketType',
    loadComponent: () => import('@/routes/market/market.component').then(mod => mod.MarketComponent)
  },
  {
    path: '**',
    redirectTo: '/',
  }
];
