import { Component, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { PermissionService, ModulePermissions } from '../../../core/services/permission.service';
import { UserPreferencesService } from '../../../core/services/user-preferences.service';
import { sortByPinnedAndUsage } from '../../utils/sort-by-pinned-and-usage';

interface HomeCard {
  icon: string;
  label: string;
  description: string;
  route: string;
}

@Component({
  selector: 'app-menu-home',
  templateUrl: './menu-home.component.html',
  imports: [AngularSvgIconModule],
})
export class MenuHomeComponent {
  private prefs = inject(UserPreferencesService);
  private ps = inject(PermissionService);
  private router = inject(Router);

  menuName = signal<string>('');
  menuDescription = signal<string>('');
  cards = signal<HomeCard[]>([]);

  constructor() {
    effect(() => {
      const menus = this.ps.menus;
      const pinned = this.prefs.favorites().pinnedMenus;
      const usage = untracked(() => this.prefs.usage().modules);

      const currentUrl = this.router.url.split('?')[0];
      const currentMenu = menus.find(m => m.route_path && currentUrl.startsWith(m.route_path));
      if (!currentMenu) return;

      this.menuName.set(currentMenu.name);
      this.menuDescription.set(currentMenu.description || '');

      // Group modules by route_path; the first (lowest display_order) in each
      // group is the representative card. Only routes the user can access are shown.
      const routeMap = new Map<string, ModulePermissions>();
      const sorted = [...currentMenu.modules].sort((a, b) => a.display_order - b.display_order);
      for (const mod of sorted) {
        if (!mod.route_path) continue;
        if (!this.ps.hasAnyPermission(mod.code)) continue;
        if (!routeMap.has(mod.route_path)) {
          routeMap.set(mod.route_path, mod);
        }
      }

      const rawCards: HomeCard[] = Array.from(routeMap.values()).map(mod => ({
        icon: mod.icon || 'assets/icons/heroicons/outline/cube.svg',
        label: mod.display_name || mod.name,
        description: mod.description || '',
        route: mod.route_path,
      }));

      this.cards.set(sortByPinnedAndUsage(rawCards, c => c.route, pinned, usage));
    });
  }

  isPinned(route: string): boolean {
    return this.prefs.favorites().pinnedMenus.includes(route);
  }

  togglePin(route: string, event: Event): void {
    event.stopPropagation();
    this.prefs.togglePinnedMenu(route);
  }

  navigate(card: HomeCard): void {
    this.router.navigate([card.route]);
  }
}
