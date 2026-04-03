import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { Subscription, filter } from 'rxjs';
import { MenuService } from '../../services/menu.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { NavbarMenuComponent } from './navbar-menu/navbar-menu.component';
import { NavbarMobileComponent } from './navbar-mobile/navbar-mobilecomponent';
import { ProfileMenuComponent } from './profile-menu/profile-menu.component';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  imports: [RouterLink, AngularSvgIconModule, NavbarMenuComponent, ProfileMenuComponent, NavbarMobileComponent],
})
export class NavbarComponent implements OnInit, OnDestroy {
  breadcrumbs: { label: string; route?: string }[] = [];
  private routerSub!: Subscription;

  private routeMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/settings': 'Settings',
    '/settings/user': 'User',
    '/settings/organization': 'Organization',
    '/settings/location': 'Location',
  };

  constructor(private menuService: MenuService, public themeService: ThemeService, private router: Router) {}

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

  private buildBreadcrumbs(url: string) {
    const parts = url.split('/').filter(Boolean);
    this.breadcrumbs = [];
    let path = '';
    for (const part of parts) {
      path += '/' + part;
      if (this.isId(part)) continue;
      const label = this.routeMap[path] || part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
      this.breadcrumbs.push({ label, route: path });
    }
  }

  public toggleMobileMenu(): void {
    this.menuService.showMobileMenu = true;
  }
}
