
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

@Injectable()
export class CustomReuseStrategy implements RouteReuseStrategy {
  private storedRoutes = new Map<string, DetachedRouteHandle>();

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return false;
    const path = route.routeConfig?.path;
    return path === '' || path === 'curated/:slug';
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    // this.storedRoutes.set(route.routeConfig?.path || '', handle);
    this.storedRoutes.clear();
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return false;
    return this.storedRoutes.has(route.routeConfig?.path || '');
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return this.storedRoutes.get(route.routeConfig?.path || '') || null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === current.routeConfig;
  }
}
