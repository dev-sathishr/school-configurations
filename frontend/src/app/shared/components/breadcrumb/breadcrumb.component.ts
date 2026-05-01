import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  imports: [RouterLink],
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  @Input() suffix = '';
  breadcrumbs: { label: string; route?: string }[] = [];
  private routerSub!: Subscription;

  private routeMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/employee': 'Employee',
    '/employee/employee-master': 'Employee Master',
    '/academic': 'Academic',
    '/academic/class': 'Class Master',
    '/master': 'Master',
    '/master/sequence': 'Sequence Master',
    '/settings': 'Settings',
    '/settings/user': 'User',
    '/settings/organization': 'Organization',
    '/settings/location': 'Location',
  };

  // Intermediate path segments that exist in URLs but have no real page —
  // show as plain text in the breadcrumb, not a clickable link.
  private nonNavigable = new Set([
    '/settings/session/users',
  ]);

  constructor(private router: Router) {}

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
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) || /^\d+$/.test(segment);
  }

  private buildBreadcrumbs(url: string) {
    const parts = url.split('?')[0].split('/').filter(Boolean);
    this.breadcrumbs = [];
    let path = '';
    for (const part of parts) {
      path += '/' + part;
      if (this.isId(part)) continue;
      const label = this.routeMap[path] || part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
      const route = this.nonNavigable.has(path) ? undefined : path;
      this.breadcrumbs.push({ label, route });
    }
  }
}
