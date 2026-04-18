import { NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ThemeService } from '../../../../core/services/theme.service';

@Component({
  selector: 'app-profile-appearance',
  templateUrl: './appearance.component.html',
  imports: [NgClass, AngularSvgIconModule],
})
export class AppearanceComponent {
  public themeColors = [
    { name: 'base', code: '#e11d48' },
    { name: 'yellow', code: '#f59e0b' },
    { name: 'green', code: '#22c55e' },
    { name: 'blue', code: '#3b82f6' },
    { name: 'orange', code: '#ea580c' },
    { name: 'red', code: '#cc0022' },
    { name: 'violet', code: '#6d28d9' },
  ];

  public themeMode: ('light' | 'dark')[] = ['light', 'dark'];
  public themeDirection: ('ltr' | 'rtl')[] = ['ltr', 'rtl'];

  constructor(public themeService: ThemeService) {}

  setMode(mode: 'light' | 'dark') {
    this.themeService.theme.update((t) => ({ ...t, mode }));
  }

  setColor(color: string) {
    this.themeService.theme.update((t) => ({ ...t, color }));
  }

  setDirection(direction: 'ltr' | 'rtl') {
    this.themeService.theme.update((t) => ({ ...t, direction }));
  }

  setMenuStyle(menuStyle: 'sidebar' | 'header') {
    this.themeService.theme.update((t) => ({ ...t, menuStyle }));
  }
}
