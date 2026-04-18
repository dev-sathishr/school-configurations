import { effect, inject, Injectable, OnDestroy, signal, untracked } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MenuItem, SubMenuItem } from 'src/app/core/models/menu.model';
import { PermissionService, PermittedMenu } from 'src/app/core/services/permission.service';
import { UserPreferencesService } from 'src/app/core/services/user-preferences.service';
import { sortByPinnedAndUsage } from 'src/app/shared/utils/sort-by-pinned-and-usage';

@Injectable({
  providedIn: 'root',
})
export class MenuService implements OnDestroy {
  private prefs = inject(UserPreferencesService);

  private _showSidebar = signal(true);
  private _showMobileMenu = signal(false);
  private _pagesMenu = signal<MenuItem[]>([]);
  private _subscription = new Subscription();
  private _latestMenus: PermittedMenu[] = [];

  constructor(private router: Router, private permissionService: PermissionService) {
    // Rebuild on permissions change.
    this._subscription.add(
      this.permissionService.menus$.subscribe((menus) => {
        this._latestMenus = menus;
        this.rebuild();
      })
    );

    // Re-sort when the pinned list changes. Usage is read untracked inside
    // rebuild(), so incrementing a usage counter on each navigation does NOT
    // cause a re-sort (spec §4 — "jumpy UX").
    effect(() => {
      this.prefs.favorites().pinnedMenus;
      this.rebuild();
    });

    this._subscription.add(
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this._pagesMenu().forEach((menu) => {
            let activeGroup = false;
            menu.items.forEach((subMenu) => {
              const active = this.isActive(subMenu.route);
              subMenu.expanded = active;
              subMenu.active = active;
              if (active) activeGroup = true;
              if (subMenu.children) {
                this.expand(subMenu.children);
              }
            });
            menu.active = activeGroup;
          });
        }
      })
    );
  }

  private rebuild() {
    if (!this._latestMenus.length) {
      this._pagesMenu.set([]);
      return;
    }
    this._pagesMenu.set(this.buildMenu(this._latestMenus));
  }

  private buildMenu(menus: PermittedMenu[]): MenuItem[] {
    const items: SubMenuItem[] = menus.map((menu) => ({
      icon: menu.icon,
      label: menu.name,
      route: menu.route_path,
    }));

    // Read usage untracked — we re-sort only on permissions load and pin changes.
    const pinned = this.prefs.favorites().pinnedMenus;
    const usage = untracked(() => this.prefs.usage().menus);
    const sorted = sortByPinnedAndUsage(items, (i) => i.route || undefined, pinned, usage);

    return [{ group: '', separator: false, items: sorted }];
  }

  get showSideBar() {
    return this._showSidebar();
  }
  get showMobileMenu() {
    return this._showMobileMenu();
  }
  get pagesMenu() {
    return this._pagesMenu();
  }

  set showSideBar(value: boolean) {
    this._showSidebar.set(value);
  }
  set showMobileMenu(value: boolean) {
    this._showMobileMenu.set(value);
  }

  public toggleSidebar() {
    this._showSidebar.set(!this._showSidebar());
  }

  public toggleMenu(menu: SubMenuItem) {
    this.showSideBar = true;

    const updatedMenu = this._pagesMenu().map((menuGroup) => {
      return {
        ...menuGroup,
        items: menuGroup.items.map((item) => {
          return {
            ...item,
            expanded: item === menu ? !item.expanded : false,
          };
        }),
      };
    });

    this._pagesMenu.set(updatedMenu);
  }

  public toggleSubMenu(submenu: SubMenuItem) {
    submenu.expanded = !submenu.expanded;
  }

  private expand(items: Array<any>) {
    items.forEach((item) => {
      item.expanded = this.isActive(item.route);
      if (item.children) this.expand(item.children);
    });
  }

  public isActive(instruction: any): boolean {
    return this.router.isActive(this.router.createUrlTree([instruction]), {
      paths: 'subset',
      queryParams: 'subset',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  // ─── Pin helpers (used by sidebar + landing cards) ──────

  isPinned(route?: string | null): boolean {
    if (!route) return false;
    return this.prefs.favorites().pinnedMenus.includes(route);
  }

  togglePin(route?: string | null): void {
    if (!route) return;
    this.prefs.togglePinnedMenu(route);
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }
}
