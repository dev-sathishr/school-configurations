import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MenuService } from '../../services/menu.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { NavbarMobileComponent } from './navbar-mobile/navbar-mobilecomponent';
import { ProfileMenuComponent } from './profile-menu/profile-menu.component';
import { ClickOutsideDirective } from '../../../../shared/directives/click-outside.directive';
import { SubMenuItem } from '../../../../core/models/menu.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  imports: [AngularSvgIconModule, ProfileMenuComponent, NavbarMobileComponent, ClickOutsideDirective, RouterLink, FormsModule],
})
export class NavbarComponent implements OnInit {
  favoritesOpen = false;
  favoriteSearch = '';
  favorites: SubMenuItem[] = [];
  allMenuItems: SubMenuItem[] = [];

  constructor(private menuService: MenuService, public themeService: ThemeService) {}

  ngOnInit(): void {
    this.allMenuItems = this.menuService.pagesMenu.flatMap((m) => this.flattenItems(m.items));
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

  get filteredMenuItems(): SubMenuItem[] {
    if (!this.favoriteSearch) return this.allMenuItems;
    const q = this.favoriteSearch.toLowerCase();
    return this.allMenuItems.filter((i) => i.label?.toLowerCase().includes(q));
  }

  isFavorite(item: SubMenuItem): boolean {
    return this.favorites.some((f) => f.route === item.route);
  }

  toggleFavorite(item: SubMenuItem): void {
    const idx = this.favorites.findIndex((f) => f.route === item.route);
    if (idx >= 0) {
      this.favorites.splice(idx, 1);
    } else {
      this.favorites.push(item);
    }
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
    }
  }

  public toggleMobileMenu(): void {
    this.menuService.showMobileMenu = true;
  }
}
