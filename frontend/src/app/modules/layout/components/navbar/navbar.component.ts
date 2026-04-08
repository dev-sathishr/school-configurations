import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MenuService } from '../../services/menu.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { NavbarMobileComponent } from './navbar-mobile/navbar-mobilecomponent';
import { ProfileMenuComponent } from './profile-menu/profile-menu.component';
import { SubMenuItem } from '../../../../core/models/menu.model';
import { SelectDropdownComponent } from '../../../../shared/components/select-dropdown/select-dropdown.component';
import type { DropdownOption } from '../../../../shared/components/select-dropdown/select-dropdown.component';
import { LocationService } from '../../../../core/services/location.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  imports: [AngularSvgIconModule, ProfileMenuComponent, NavbarMobileComponent, RouterLink, SelectDropdownComponent],
})
export class NavbarComponent implements OnInit {
  favorites: SubMenuItem[] = [];
  allMenuItems: SubMenuItem[] = [];
  favoriteOptions: DropdownOption[] = [];
  selectedFavoriteValues: string[] = [];

  constructor(private menuService: MenuService, public themeService: ThemeService, public locationService: LocationService) {}

  ngOnInit(): void {
    this.allMenuItems = this.menuService.pagesMenu.flatMap((m) => this.flattenItems(m.items));
    this.favoriteOptions = this.allMenuItems.map((item) => ({
      value: item.route || '',
      label: item.label || '',
      icon: item.icon,
    }));
    this.loadFavorites();
  }

  private flattenItems(items: SubMenuItem[]): SubMenuItem[] {
    const result: SubMenuItem[] = [];
    for (const item of items) {
      if (item.route) result.push(item);
      if (item.children) result.push(...this.flattenItems(item.children));
    }
    return result;
  }

  get favoritesHeader(): string {
    if (this.favorites.length === 0) return 'Select favorite menu items';
    return `${this.favorites.length} menu item${this.favorites.length > 1 ? 's' : ''} selected`;
  }

  onFavoritesChange(values: string[]): void {
    this.selectedFavoriteValues = values;
    this.favorites = this.allMenuItems.filter((item) => values.includes(item.route || ''));
    this.saveFavorites();
  }

  private saveFavorites(): void {
    const data = this.favorites.map((f) => ({ route: f.route, label: f.label, icon: f.icon }));
    localStorage.setItem('nav_favorites', JSON.stringify(data));
  }

  private loadFavorites(): void {
    const stored = localStorage.getItem('nav_favorites');
    if (stored) {
      const data = JSON.parse(stored) as SubMenuItem[];
      this.favorites = data.filter((d) => this.allMenuItems.some((m) => m.route === d.route));
      this.selectedFavoriteValues = this.favorites.map((f) => f.route || '');
    }
  }

  get locationOptions(): DropdownOption[] {
    return this.locationService.locations.map((l) => ({
      value: l.location_id,
      label: l.name,
    }));
  }

  onLocationSwitch(locationId: string): void {
    this.locationService.switchLocation(locationId);
  }

  public toggleMobileMenu(): void {
    this.menuService.showMobileMenu = true;
  }
}
