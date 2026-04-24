import { Component, computed, inject } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { PermissionService } from '../../../../core/services/permission.service';
import { UsageEntry, UserPreferencesService } from '../../../../core/services/user-preferences.service';
import { usageScore } from '../../../../shared/utils/sort-by-pinned-and-usage';

interface RouteInfo {
  route: string;
  label: string;
  icon: string;
}

interface RouteWithUsage extends RouteInfo {
  count: number;
  lastAccessed: string;
}

@Component({
  selector: 'app-profile-favorites',
  templateUrl: './favorites.component.html',
  imports: [AngularSvgIconModule],
})
export class FavoritesComponent {
  private prefs = inject(UserPreferencesService);
  private permissions = inject(PermissionService);

  /** route → { label, icon } derived from the permission tree. */
  private routeIndex = computed(() => {
    const idx = new Map<string, RouteInfo>();
    for (const menu of this.permissions.menus) {
      if (menu.route_path) {
        idx.set(menu.route_path, {
          route: menu.route_path,
          label: menu.display_name || menu.code || menu.name,
          icon: menu.icon,
        });
      }
      for (const mod of menu.modules) {
        if (mod.route_path) {
          idx.set(mod.route_path, {
            route: mod.route_path,
            label: mod.display_name || mod.code || mod.name,
            icon: mod.icon || menu.icon,
          });
        }
      }
    }
    return idx;
  });

  pinned = computed<RouteInfo[]>(() => {
    const idx = this.routeIndex();
    return this.prefs.favorites().pinnedMenus
      .map((r) => idx.get(r) ?? { route: r, label: r, icon: '' });
  });

  navFavorites = computed<RouteInfo[]>(() => {
    const idx = this.routeIndex();
    return this.prefs.favorites().modules
      .map((r) => idx.get(r) ?? { route: r, label: r, icon: '' });
  });

  mostUsed = computed<RouteWithUsage[]>(() => {
    const idx = this.routeIndex();
    const buckets = this.prefs.usage();
    // Combine menu + module usage keyed by route.
    const combined: Record<string, UsageEntry> = { ...buckets.menus, ...buckets.modules };
    const now = Date.now();
    return Object.entries(combined)
      .map(([route, entry]) => {
        const info = idx.get(route) ?? { route, label: route, icon: '' };
        return {
          ...info,
          count: entry.count,
          lastAccessed: entry.lastAccessed,
          score: usageScore(entry, now),
        };
      })
      .filter((e) => e.count > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  });

  movePinUp(route: string) {
    this.prefs.movePinnedMenu(route, -1);
  }

  movePinDown(route: string) {
    this.prefs.movePinnedMenu(route, 1);
  }

  unpin(route: string) {
    this.prefs.togglePinnedMenu(route);
  }

  removeFavorite(route: string) {
    const next = this.prefs.favorites().modules.filter((r) => r !== route);
    this.prefs.setFavoriteModules(next);
  }
}
