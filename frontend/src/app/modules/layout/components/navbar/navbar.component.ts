import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MenuService } from '../../services/menu.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { PermissionService, PermittedMenu } from '../../../../core/services/permission.service';
import { UserPreferencesService } from '../../../../core/services/user-preferences.service';
import { LocationContextService } from '../../../../core/services/location-context.service';
import { NavbarMobileComponent } from './navbar-mobile/navbar-mobilecomponent';
import { ProfileMenuComponent } from './profile-menu/profile-menu.component';
import { SelectDropdownComponent } from '../../../../shared/components/select-dropdown/select-dropdown.component';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';
import { ChatPanelComponent } from './chat-panel/chat-panel.component';
import { ClickOutsideDirective } from '../../../../shared/directives/click-outside.directive';
import type { DropdownOption } from '../../../../shared/components/select-dropdown/select-dropdown.component';

interface FavoriteItem {
  route: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  imports: [AngularSvgIconModule, ProfileMenuComponent, NavbarMobileComponent, RouterLink, SelectDropdownComponent, NotificationBellComponent, ChatPanelComponent, ClickOutsideDirective],
})
export class NavbarComponent implements OnInit, OnDestroy {
  private prefs = inject(UserPreferencesService);
  private router = inject(Router);
  readonly locationCtx = inject(LocationContextService);

  favorites: FavoriteItem[] = [];
  allModules = signal<FavoriteItem[]>([]);
  favoriteOptions: DropdownOption[] = [];
  selectedFavoriteValues: string[] = [];

  readonly locationOptions = computed<DropdownOption[]>(() =>
    this.locationCtx.permitted().map((l) => ({
      value: l.id,
      label: l.code ? `${l.name} (${l.code})` : l.name,
    }))
  );
  readonly locationHeader = computed(() => {
    const total = this.locationCtx.permitted().length;
    const selected = this.locationCtx.selectedIds().length;
    if (total === 0) return 'No locations';
    if (selected === 0) return 'No location selected';
    if (selected === total) return `All locations (${total})`;
    return `${selected} of ${total} locations`;
  });

  // ─── Global search ─────────────────────────────────────
  searchQuery = signal('');
  searchOpen = signal(false);
  searchResults = computed<FavoriteItem[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return [];
    return this.allModules()
      .filter((m) => m.label.toLowerCase().includes(q) || m.route.toLowerCase().includes(q))
      .slice(0, 10);
  });

  private sub?: Subscription;

  constructor(private menuService: MenuService, public themeService: ThemeService, private permissionService: PermissionService) {
    // Re-derive favorites whenever preferences change (initial cache paint,
    // then again when the server load resolves and on any cross-device change
    // picked up on next navigation).
    effect(() => {
      const routes = this.prefs.favorites().modules;
      this.rebuildFavorites(routes);
    });
  }

  ngOnInit(): void {
    this.sub = this.permissionService.menus$.subscribe((menus) => {
      this.buildModuleList(menus);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private buildModuleList(menus: PermittedMenu[]): void {
    const candidates: FavoriteItem[] = [];

    for (const menu of menus) {
      if (menu.modules.length === 0 && menu.route_path) {
        candidates.push({ route: menu.route_path, label: menu.name, icon: menu.icon });
      }

      for (const mod of menu.modules) {
        if (mod.route_path) {
          candidates.push({ route: mod.route_path, label: mod.name, icon: mod.icon || menu.icon });
        }
      }
    }

    const grouped = new Map<string, FavoriteItem[]>();
    for (const item of candidates) {
      const route = String(item.route || '').trim();
      if (!route) continue;
      const list = grouped.get(route) || [];
      list.push(item);
      grouped.set(route, list);
    }

    const modules: FavoriteItem[] = [];
    for (const [route, list] of grouped.entries()) {
      const first = list[0];
      if (list.length === 1) {
        modules.push(first);
        continue;
      }

      // When multiple modules resolve to the same route (e.g. Employee
      // Category/Group/Designation -> /employee/employee-master), show one
      // unified favorite item for that route.
      modules.push({
        route,
        label: this.prettyLabelFromRoute(route),
        icon: list.find((i) => !!i.icon)?.icon || first.icon,
      });
    }

    this.allModules.set(modules);

    this.favoriteOptions = modules.map((item) => ({
      value: item.route,
      label: item.label,
      icon: item.icon,
    }));

    this.rebuildFavorites(this.prefs.favorites().modules);
  }

  private prettyLabelFromRoute(route: string): string {
    const cleaned = String(route || '').replace(/\/+$/, '');
    const parts = cleaned.split('/').filter(Boolean);
    const slug = (parts[parts.length - 1] || cleaned || 'module').trim();
    return slug
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  private rebuildFavorites(routes: string[]): void {
    const modules = this.allModules();
    if (modules.length === 0) {
      this.favorites = [];
      this.selectedFavoriteValues = routes.slice();
      return;
    }
    const byRoute = new Map(modules.map((m) => [m.route, m]));
    this.favorites = routes
      .map((r) => byRoute.get(r))
      .filter((m): m is FavoriteItem => !!m);
    this.selectedFavoriteValues = this.favorites.map((f) => f.route);
  }

  get favoritesHeader(): string {
    if (this.favorites.length === 0) return 'Select favorite modules';
    return `${this.favorites.length} module${this.favorites.length > 1 ? 's' : ''} selected`;
  }

  onFavoritesChange(values: string[]): void {
    // Preserve the user's selection order from the dropdown.
    this.selectedFavoriteValues = values;
    const modules = this.allModules();
    this.favorites = values
      .map((v) => modules.find((m) => m.route === v))
      .filter((m): m is FavoriteItem => !!m);
    this.prefs.setFavoriteModules(this.favorites.map((f) => f.route));
  }

  onLocationsChange(values: string[]): void {
    this.locationCtx.setSelection(values);
  }

  public toggleMobileMenu(): void {
    this.menuService.showMobileMenu = true;
  }

  // ─── Global search ─────────────────────────────────────

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.searchOpen.set(!!val.trim());
  }

  onSearchFocus(): void {
    if (this.searchQuery().trim()) this.searchOpen.set(true);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.clearSearch();
    } else if (event.key === 'Enter') {
      const first = this.searchResults()[0];
      if (first) this.selectResult(first);
    }
  }

  selectResult(item: FavoriteItem): void {
    this.router.navigate([item.route]);
    this.clearSearch();
  }

  closeSearch(): void {
    this.searchOpen.set(false);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchOpen.set(false);
  }
}
