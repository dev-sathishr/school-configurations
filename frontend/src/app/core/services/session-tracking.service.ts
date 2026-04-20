import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonService } from '../../shared/services/common/common.service';
import { AuthService } from './auth.service';
import { PermissionService } from './permission.service';

/**
 * Logs route changes to `POST /sessions/activity` so the admin can audit
 * which modules a user opened during their session.
 *
 * Throttled client-side to the same route within 60s — the backend also
 * dedupes, but short-circuiting here saves a round-trip per re-mount.
 * Skipped when the user isn't logged in (sign-in page navigations don't
 * belong in an authenticated session's activity).
 */
@Injectable({ providedIn: 'root' })
export class SessionTrackingService {
  private readonly router = inject(Router);
  private readonly cs = inject(CommonService);
  private readonly auth = inject(AuthService);
  private readonly perms = inject(PermissionService);

  private readonly THROTTLE_MS = 60_000;
  private lastLogged = new Map<string, number>(); // route -> epoch ms

  start(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => this.maybeLog(event.urlAfterRedirects));
  }

  private maybeLog(route: string): void {
    if (!this.auth.isLoggedIn()) return;
    if (route.startsWith('/auth/')) return;

    const now = Date.now();
    const prev = this.lastLogged.get(route) || 0;
    if (now - prev < this.THROTTLE_MS) return;
    this.lastLogged.set(route, now);

    const moduleCode = this.resolveModuleCode(route);
    this.cs.postService({
      url: '/sessions/activity',
      payload: { route_path: route, module_code: moduleCode },
    }).subscribe({ error: () => { /* non-critical — swallow */ } });
  }

  /**
   * Match the current route against the permissioned-module list so the
   * activity row carries the human-readable module code (USERS, CLASSES).
   * Falls back to the top-level segment (/settings/x -> SETTINGS) when no
   * match is found, which happens for dashboard / profile / etc.
   */
  private resolveModuleCode(route: string): string | null {
    for (const menu of this.perms.menus) {
      for (const mod of menu.modules) {
        if (mod.route_path && route.startsWith(mod.route_path)) return mod.code;
      }
      if (menu.route_path && route.startsWith(menu.route_path)) return menu.code;
    }
    return null;
  }
}
