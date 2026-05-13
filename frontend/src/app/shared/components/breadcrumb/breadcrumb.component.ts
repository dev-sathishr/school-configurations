import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { PermissionService, PermittedMenu, ModulePermissions } from '../../../core/services/permission.service';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  imports: [RouterLink],
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  @Input() suffix = '';
  breadcrumbs: { label: string; route?: string }[] = [];
  private routerSub!: Subscription;

  constructor(private router: Router, private ps: PermissionService) {}

  ngOnInit(): void {
    this.buildBreadcrumbs(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => this.buildBreadcrumbs(e.urlAfterRedirects || e.url));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private isId(segment: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
      || /^\d+$/.test(segment);
  }

  // Find the menu that owns the given full URL path
  private menuForUrl(url: string): PermittedMenu | null {
    let best: PermittedMenu | null = null;
    let bestLen = 0;
    for (const menu of this.ps.menus) {
      const rp = menu.route_path;
      if (rp && url.startsWith(rp) && rp.length > bestLen) {
        best = menu;
        bestLen = rp.length;
      }
    }
    return best;
  }

  // Find the module whose route_path exactly matches the given path
  private moduleForUrl(url: string): ModulePermissions | null {
    for (const menu of this.ps.menus) {
      for (const mod of menu.modules) {
        if (mod.route_path && url.startsWith(mod.route_path)) {
          return mod;
        }
      }
    }
    return null;
  }

  private buildBreadcrumbs(url: string) {
    const cleanUrl = url.split('?')[0];
    const parts = cleanUrl.split('/').filter(Boolean);
    this.breadcrumbs = [];

    // Find which menu owns this URL — first crumb is always the menu
    const menu = this.menuForUrl(cleanUrl);
    if (menu) {
      this.breadcrumbs.push({ label: menu.name || menu.display_name || '', route: menu.route_path });
    }

    // Find which module owns this URL — second crumb is the module
    const mod = this.moduleForUrl(cleanUrl);
    if (mod && mod.route_path !== menu?.route_path) {
      this.breadcrumbs.push({ label: mod.display_name || mod.name || '', route: mod.route_path });
    }

    // Remaining crumbs: segments beyond the module's route_path
    // These are action/id segments: new, edit, view, :id, :slug (record identifiers)
    const basePath = mod?.route_path ?? menu?.route_path ?? '';
    const baseSegments = basePath.split('/').filter(Boolean);
    const remaining = parts.slice(baseSegments.length);

    for (const seg of remaining) {
      // Skip UUIDs, numeric IDs, and DocType slugs (text record identifiers after the module path)
      if (this.isId(seg)) continue;
      // Only show terminal action words
      if (seg === 'new') { this.breadcrumbs.push({ label: 'New' }); continue; }
      if (seg === 'edit') { this.breadcrumbs.push({ label: 'Edit' }); continue; }
      if (seg === 'view') { this.breadcrumbs.push({ label: 'View' }); continue; }
      // All other segments after the module path are record identifiers (text slugs) — skip them
    }
  }
}
