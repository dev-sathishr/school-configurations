import { Component, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, merge, startWith, forkJoin, of } from 'rxjs';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { PermissionService, ModulePermissions } from '../../../core/services/permission.service';
import { UserPreferencesService } from '../../../core/services/user-preferences.service';
import { DoctypeConfigService } from '../../../core/services/doctype-config.service';
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
  private prefs        = inject(UserPreferencesService);
  private ps           = inject(PermissionService);
  private router       = inject(Router);
  private route        = inject(ActivatedRoute);
  private doctypeConfig = inject(DoctypeConfigService);

  private firstSegment = () =>
    this.router.url.split('?')[0].split('/').filter(Boolean)[0] ?? '';

  private menuSegment = toSignal(
    merge(
      this.route.parent!.paramMap.pipe(map(p => p.get('menu') || this.firstSegment())),
      this.router.events.pipe(
        filter(e => e instanceof NavigationEnd),
        map(() => this.firstSegment()),
        startWith(this.firstSegment()),
      ),
    ),
    { initialValue: this.firstSegment() }
  );

  menuName        = signal<string>('');
  menuDescription = signal<string>('');
  cards           = signal<HomeCard[]>([]);

  constructor() {
    effect(() => {
      const menus  = this.ps.menus;
      const pinned = this.prefs.favorites().pinnedMenus;
      const usage  = untracked(() => this.prefs.usage().modules);

      const segment = this.menuSegment();
      const currentMenu = menus.find(m => {
        if (!m.route_path) return false;
        const tail = m.route_path.split('/').filter(Boolean).pop() ?? '';
        return tail.toLowerCase() === segment.toLowerCase();
      });
      if (!currentMenu) return;

      this.menuName.set(currentMenu.name);
      this.menuDescription.set(currentMenu.description || '');

      // Group modules by route_path. Only include routes where the user has any
      // permission on at least one module in the group.
      const sorted = [...currentMenu.modules].sort((a, b) => a.display_order - b.display_order);
      const routeGroups = new Map<string, ModulePermissions[]>();
      for (const mod of sorted) {
        if (!mod.route_path) continue;
        if (!this.ps.hasAnyPermission(mod.name)) continue;
        const group = routeGroups.get(mod.route_path) ?? [];
        group.push(mod);
        routeGroups.set(mod.route_path, group);
      }

      // For routes with multiple modules (tab-groups), fetch the DocType label
      // for the route slug so the card shows the tab-group's own label
      // (e.g. "Sequence Master") instead of the first child module's name.
      const labelFetches = Array.from(routeGroups.entries()).map(([route, mods]) => {
        if (mods.length === 1) {
          return of({ route, mods, doctypeLabel: null as string | null, doctypeDescription: null as string | null });
        }
        const slug = route.split('/').filter(Boolean).pop() ?? '';
        return this.doctypeConfig.get(slug).pipe(
          map(doc => ({
            route,
            mods,
            doctypeLabel: doc?.label ?? null,
            doctypeDescription: doc?.description ?? null,
          }))
        );
      });

      forkJoin(labelFetches).subscribe(groups => {
        const rawCards: HomeCard[] = groups.map(({ route, mods, doctypeLabel, doctypeDescription }) => {
          const rep = mods[0];
          return {
            icon: rep.icon || 'assets/icons/heroicons/outline/cube.svg',
            label: doctypeLabel ?? rep.display_name ?? rep.name,
            description: doctypeDescription ?? rep.description ?? '',
            route,
          };
        });

        this.cards.set(sortByPinnedAndUsage(rawCards, c => c.route, pinned, usage));
      });
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
