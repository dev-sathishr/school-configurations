import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MenuService } from '../../services/menu.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { NavbarMobileComponent } from './navbar-mobile/navbar-mobilecomponent';
import { ProfileMenuComponent } from './profile-menu/profile-menu.component';
import { SelectDropdownComponent } from '../../../../shared/components/select-dropdown/select-dropdown.component';
import type { DropdownOption } from '../../../../shared/components/select-dropdown/select-dropdown.component';
import { CommonService } from '../../../../shared/services/common/common.service';

interface FavoriteItem {
  route: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  imports: [AngularSvgIconModule, ProfileMenuComponent, NavbarMobileComponent, RouterLink, SelectDropdownComponent],
})
export class NavbarComponent implements OnInit {
  favorites: FavoriteItem[] = [];
  allModules: FavoriteItem[] = [];
  favoriteOptions: DropdownOption[] = [];
  selectedFavoriteValues: string[] = [];

  constructor(private menuService: MenuService, public themeService: ThemeService, private cs: CommonService) {}

  ngOnInit(): void {
    // Load favorites from localStorage immediately so they render without waiting for the API
    this.loadFavorites();

    this.cs.getService({ url: '/menus/with-modules' }).subscribe({
      next: (res: any) => {
        const menus = res.data || res || [];
        this.allModules = [];

        for (const menu of menus) {
          // Add Dashboard menu itself as a module-level item (it has no child modules)
          if (menu.code === 'DASHBOARD' && menu.icon && menu.route_path) {
            this.allModules.push({ route: menu.route_path, label: menu.name, icon: menu.icon });
          }

          // Add modules from each menu
          for (const mod of menu.modules || []) {
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

        // Re-validate favorites against the actual API data (remove stale entries)
        if (this.favorites.length > 0) {
          this.favorites = this.favorites.filter((d) => this.allModules.some((m) => m.route === d.route));
          this.selectedFavoriteValues = this.favorites.map((f) => f.route);
          this.saveFavorites();
        }
      },
    });
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
