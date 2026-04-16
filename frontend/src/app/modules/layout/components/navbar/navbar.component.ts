import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MenuService } from '../../services/menu.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { PermissionService, PermittedMenu } from '../../../../core/services/permission.service';
import { NavbarMobileComponent } from './navbar-mobile/navbar-mobilecomponent';
import { ProfileMenuComponent } from './profile-menu/profile-menu.component';
import { SelectDropdownComponent } from '../../../../shared/components/select-dropdown/select-dropdown.component';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';
import { ChatPanelComponent } from './chat-panel/chat-panel.component';
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
  imports: [AngularSvgIconModule, ProfileMenuComponent, NavbarMobileComponent, RouterLink, SelectDropdownComponent, NotificationBellComponent, ChatPanelComponent],
})
export class NavbarComponent implements OnInit, OnDestroy {
  favorites: FavoriteItem[] = [];
  allModules: FavoriteItem[] = [];
  favoriteOptions: DropdownOption[] = [];
  selectedFavoriteValues: string[] = [];
  private sub?: Subscription;

  constructor(private menuService: MenuService, public themeService: ThemeService, private permissionService: PermissionService) {}

  ngOnInit(): void {
    this.loadFavorites();

    this.sub = this.permissionService.menus$.subscribe((menus) => {
      this.buildModuleList(menus);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private buildModuleList(menus: PermittedMenu[]): void {
    this.allModules = [];

    for (const menu of menus) {
      if (menu.modules.length === 0 && menu.route_path) {
        this.allModules.push({ route: menu.route_path, label: menu.name, icon: menu.icon });
      }

      for (const mod of menu.modules) {
        if (mod.route_path) {
          this.allModules.push({ route: mod.route_path, label: mod.name, icon: mod.icon || menu.icon });
        }
      }
    }

    this.favoriteOptions = this.allModules.map((item) => ({
      value: item.route,
      label: item.label,
      icon: item.icon,
    }));

    if (this.favorites.length > 0) {
      this.favorites = this.favorites.filter((d) => this.allModules.some((m) => m.route === d.route));
      this.selectedFavoriteValues = this.favorites.map((f) => f.route);
      this.saveFavorites();
    }
  }

  get favoritesHeader(): string {
    if (this.favorites.length === 0) return 'Select favorite modules';
    return `${this.favorites.length} module${this.favorites.length > 1 ? 's' : ''} selected`;
  }

  onFavoritesChange(values: string[]): void {
    this.selectedFavoriteValues = values;
    this.favorites = this.allModules.filter((item) => values.includes(item.route));
    this.saveFavorites();
  }

  private saveFavorites(): void {
    const data = this.favorites.map((f) => ({ route: f.route, label: f.label, icon: f.icon }));
    localStorage.setItem('nav_favorites', JSON.stringify(data));
  }

  private loadFavorites(): void {
    const stored = localStorage.getItem('nav_favorites');
    if (stored) {
      this.favorites = JSON.parse(stored) as FavoriteItem[];
      this.selectedFavoriteValues = this.favorites.map((f) => f.route);
    }
  }

  public toggleMobileMenu(): void {
    this.menuService.showMobileMenu = true;
  }
}
