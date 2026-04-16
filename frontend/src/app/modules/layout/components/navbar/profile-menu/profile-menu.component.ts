import { animate, state, style, transition, trigger } from '@angular/animations';
import { NgClass } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ThemeService } from '../../../../../core/services/theme.service';
import { AuthService, User } from '../../../../../core/services/auth.service';
import { ClickOutsideDirective } from '../../../../../shared/directives/click-outside.directive';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-profile-menu',
  templateUrl: './profile-menu.component.html',
  styleUrls: ['./profile-menu.component.css'],
  imports: [ClickOutsideDirective, NgClass, RouterLink, AngularSvgIconModule],
  animations: [
    trigger('openClose', [
      state('open', style({ opacity: 1, transform: 'translateY(0)', visibility: 'visible' })),
      state('closed', style({ opacity: 0, transform: 'translateY(-20px)', visibility: 'hidden' })),
      transition('open => closed', [animate('0.2s')]),
      transition('closed => open', [animate('0.2s')]),
    ]),
  ],
})
export class ProfileMenuComponent implements OnInit {
  public isOpen = false;
  public activeTab: 'menu' | 'appearance' = 'menu';

  public profileMenu = [
    { title: 'Your Profile', icon: './assets/icons/heroicons/outline/user-circle.svg', link: '/profile' },
    { title: 'Settings', icon: './assets/icons/heroicons/outline/cog-6-tooth.svg', link: '/settings' },
  ];

  public themeColors = [
    { name: 'base', code: '#e11d48' },
    { name: 'yellow', code: '#f59e0b' },
    { name: 'green', code: '#22c55e' },
    { name: 'blue', code: '#3b82f6' },
    { name: 'orange', code: '#ea580c' },
    { name: 'red', code: '#cc0022' },
    { name: 'violet', code: '#6d28d9' },
  ];

  public themeMode = ['light', 'dark'];
  public themeDirection = ['ltr', 'rtl'];
  public currentUser: User | null = null;
  public profileImageUrl: string | null = null;
  public profileImageError = false;

  constructor(public themeService: ThemeService, private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    if (this.currentUser?.profile_file_id) {
      const token = this.authService.getToken();
      this.profileImageUrl = `${environment.apiUrl}/files/${this.currentUser.profile_file_id}?token=${token}`;
    }
  }

  onImageError(): void {
    this.profileImageError = true;
    this.profileImageUrl = null;
  }

  get userInitial(): string {
    return (this.currentUser?.full_name || '?').charAt(0).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
  }

  public toggleMenu(): void {
    this.isOpen = !this.isOpen;
    this.activeTab = 'menu';
  }

  toggleThemeMode() {
    this.themeService.theme.update((theme) => {
      const mode = !this.themeService.isDark ? 'dark' : 'light';
      return { ...theme, mode };
    });
  }

  toggleThemeColor(color: string) {
    this.themeService.theme.update((theme) => ({ ...theme, color }));
  }

  setDirection(value: string) {
    this.themeService.theme.update((theme) => ({ ...theme, direction: value }));
  }

  setMenuStyle(value: 'sidebar' | 'header') {
    this.themeService.theme.update((theme) => ({ ...theme, menuStyle: value }));
  }
}
