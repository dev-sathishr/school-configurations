import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonService } from '../../shared/services/common/common.service';
import { AuthService } from './auth.service';
import { PermissionService } from './permission.service';
import { API } from '../api/endpoints';

@Injectable({ providedIn: 'root' })
export class SessionTrackingService {
  private readonly router = inject(Router);
  private readonly cs = inject(CommonService);
  private readonly auth = inject(AuthService);
  private readonly perms = inject(PermissionService);

  // 3 s is long enough to ignore component re-mounts but short enough that
  // normal navigation (dashboard → class → dashboard) is always captured.
  private readonly THROTTLE_MS = 3_000;
  private lastLogged = new Map<string, number>();

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
      url: API.sessions.activity,
      payload: { route_path: route, module_code: moduleCode },
    }).subscribe({ error: () => {} });
  }

  /** Longest-prefix match so /academic/class wins over /academic. */
  resolveModuleCode(route: string): string | null {
    let best: { code: string; len: number } | null = null;
    for (const menu of this.perms.menus) {
      for (const mod of menu.modules) {
        if (mod.route_path && route.startsWith(mod.route_path)) {
          if (!best || mod.route_path.length > best.len) {
            best = { code: mod.code, len: mod.route_path.length };
          }
        }
      }
      if (menu.route_path && route.startsWith(menu.route_path)) {
        if (!best || menu.route_path.length > best.len) {
          best = { code: menu.code, len: menu.route_path.length };
        }
      }
    }
    return best?.code ?? null;
  }
}
