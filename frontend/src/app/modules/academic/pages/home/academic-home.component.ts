import { Component, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { PermissionService } from '../../../../core/services/permission.service';
import { UserPreferencesService } from '../../../../core/services/user-preferences.service';
import { sortByPinnedAndUsage } from '../../../../shared/utils/sort-by-pinned-and-usage';

interface AcademicCard {
  icon: string;
  label: string;
  description: string;
  route: string;
  color: string;
  moduleCode: string;
}

@Component({
  selector: 'app-academic-home',
  template: `
    <div>
      <div class="mb-6">
        <h2 class="text-foreground text-xl font-semibold">Academic</h2>
        <p class="text-muted-foreground text-sm">Manage your school academic configuration</p>
      </div>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        @for (card of cards(); track card.route) {
          <div
            (click)="navigate(card)"
            class="bg-background border-muted/30 hover:border-primary/30 hover:shadow-md group relative flex cursor-pointer flex-col items-center rounded-xl border p-6 text-center transition-all duration-200">
            <button
              type="button"
              (click)="togglePin(card.route, $event)"
              [title]="isPinned(card.route) ? 'Unpin' : 'Pin to top'"
              [ngClass]="isPinned(card.route)
                ? 'text-primary'
                : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-primary'"
              class="absolute right-2 top-2 flex cursor-pointer items-center justify-center rounded p-1 transition-opacity">
              <svg-icon src="assets/icons/heroicons/outline/bookmark.svg" [svgClass]="'h-4 w-4'"></svg-icon>
            </button>
            <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-lg {{ card.color }}">
              <svg-icon [src]="card.icon" [svgClass]="'h-6 w-6'"></svg-icon>
            </div>
            <h3 class="text-foreground group-hover:text-primary text-sm font-semibold">{{ card.label }}</h3>
            <p class="text-muted-foreground mt-1 text-xs leading-relaxed">{{ card.description }}</p>
          </div>
        }
      </div>
    </div>
  `,
  imports: [AngularSvgIconModule, NgClass],
})
export class AcademicHomeComponent implements OnInit {
  private prefs = inject(UserPreferencesService);

  private allCards: AcademicCard[] = [
    {
      icon: 'assets/icons/heroicons/outline/table-cells.svg',
      label: 'Classes',
      description: 'Manage classes, sections and academic levels',
      route: '/academic/class',
      color: 'bg-blue-500/10 text-blue-600',
      moduleCode: 'CLASSES',
    },
  ];

  cards = signal<AcademicCard[]>([]);

  constructor(private router: Router, private permissionService: PermissionService) {
    effect(() => {
      const pinned = this.prefs.favorites().pinnedMenus;
      const usage = untracked(() => this.prefs.usage().modules);
      const visible = this.allCards.filter((c) => this.permissionService.hasAnyPermission(c.moduleCode));
      this.cards.set(sortByPinnedAndUsage(visible, (c) => c.route, pinned, usage));
    });
  }

  ngOnInit(): void {}

  isPinned(route: string): boolean {
    return this.prefs.favorites().pinnedMenus.includes(route);
  }

  togglePin(route: string, event: Event) {
    event.stopPropagation();
    this.prefs.togglePinnedMenu(route);
  }

  navigate(card: AcademicCard) {
    this.router.navigate([card.route]);
  }
}
