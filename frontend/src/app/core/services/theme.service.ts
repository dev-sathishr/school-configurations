import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Theme } from '../models/theme.model';
import { AppearancePrefs, UserPreferencesService } from './user-preferences.service';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private prefs = inject(UserPreferencesService);

  public theme = signal<Theme>(this.toTheme(this.prefs.appearance()));

  constructor() {
    // UserPreferencesService → local `theme` signal (initial + post-load sync).
    effect(() => {
      const mapped = this.toTheme(this.prefs.appearance());
      const current = untracked(() => this.theme());
      if (!this.sameTheme(current, mapped)) this.theme.set(mapped);
    });

    // `theme` signal → DOM + UserPreferences write-through.
    effect(() => {
      const t = this.theme();
      this.applyDom(t);
      const currentAppearance = untracked(() => this.prefs.appearance());
      const mapped = this.fromTheme(t);
      if (!this.sameAppearance(currentAppearance, mapped)) {
        this.prefs.setAppearance(mapped);
      }
    });
  }

  public get isDark(): boolean {
    return this.theme().mode === 'dark';
  }

  private toTheme(a: AppearancePrefs): Theme {
    return { mode: a.mode, color: a.color, direction: a.direction, menuStyle: a.menu };
  }

  private fromTheme(t: Theme): AppearancePrefs {
    return {
      mode: t.mode as AppearancePrefs['mode'],
      color: t.color,
      direction: t.direction as AppearancePrefs['direction'],
      menu: t.menuStyle,
    };
  }

  private sameTheme(a: Theme, b: Theme): boolean {
    return a.mode === b.mode && a.color === b.color && a.direction === b.direction && a.menuStyle === b.menuStyle;
  }

  private sameAppearance(a: AppearancePrefs, b: AppearancePrefs): boolean {
    return a.mode === b.mode && a.color === b.color && a.direction === b.direction && a.menu === b.menu;
  }

  private applyDom(t: Theme): void {
    const html = document.querySelector('html');
    if (!html) return;
    html.className = t.mode;
    html.setAttribute('data-theme', t.color);
    html.setAttribute('dir', t.direction);
  }
}
