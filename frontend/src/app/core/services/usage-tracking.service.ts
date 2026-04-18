import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { PermissionService, PermittedMenu } from './permission.service';
import { UserPreferencesService } from './user-preferences.service';

/**
 * Listens for NavigationEnd events and increments usage counters for the
 * best-matching known route (longest prefix match against permission menus).
 *
 * Unknown routes (e.g. `/profile`, `/auth/sign-in`) are silently ignored so
 * the usage map stays aligned with the permission model.
 */
@Injectable({ providedIn: 'root' })
export class UsageTrackingService {
  private router = inject(Router);
  private permissions = inject(PermissionService);
  private prefs = inject(UserPreferencesService);

  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects || event.url;
        const match = this.matchRoute(url, this.permissions.menus);
        if (match) this.prefs.track(match.type, match.route);
      });
  }

  private matchRoute(
    url: string,
    menus: PermittedMenu[],
  ): { type: 'menu' | 'module'; route: string } | null {
    const clean = (url.split('?')[0].split('#')[0]) || '';

    const candidates: { type: 'menu' | 'module'; route: string }[] = [];
    for (const menu of menus) {
      if (menu.route_path) candidates.push({ type: 'menu', route: menu.route_path });
      for (const mod of menu.modules) {
        if (mod.route_path) candidates.push({ type: 'module', route: mod.route_path });
      }
    }
    // Longest route first — a sub-module path is a prefix superset of its parent menu.
    candidates.sort((a, b) => b.route.length - a.route.length);

    for (const c of candidates) {
      if (clean === c.route || clean.startsWith(c.route + '/')) return c;
    }
    return null;
  }
}
