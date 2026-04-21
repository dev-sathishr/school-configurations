import { Component, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { PermissionService } from '../../../../core/services/permission.service';
import { UserPreferencesService } from '../../../../core/services/user-preferences.service';
import { sortByPinnedAndUsage } from '../../../../shared/utils/sort-by-pinned-and-usage';

interface EmployeeCard {
  icon: string;
  label: string;
  description: string;
  route: string;
  color: string;
  moduleCodes: string[];
}

@Component({
  selector: 'app-employee-home',
  templateUrl: './employee-home.component.html',
  standalone: true,
  imports: [AngularSvgIconModule, NgClass],
})
export class EmployeeHomeComponent {
  private prefs = inject(UserPreferencesService);

  private allCards: EmployeeCard[] = [
    {
      icon: 'assets/icons/heroicons/outline/users.svg',
      label: 'Employee Master',
      description: 'Manage employee categories, groups and designations',
      route: '/employee/employee-master',
      color: 'bg-blue-500/10 text-blue-600',
      moduleCodes: ['EMPLOYEE_CATEGORIES', 'EMPLOYEE_GROUPS', 'DESIGNATIONS'],
    },
  ];

  cards = signal<EmployeeCard[]>([]);

  constructor(private router: Router, private permissionService: PermissionService) {
    effect(() => {
      const pinned = this.prefs.favorites().pinnedMenus;
      const usage = untracked(() => this.prefs.usage().modules);
      const visible = this.allCards.filter((c) => c.moduleCodes.some((code) => this.permissionService.hasAnyPermission(code)));
      this.cards.set(sortByPinnedAndUsage(visible, (c) => c.route, pinned, usage));
    });
  }

  isPinned(route: string): boolean {
    return this.prefs.favorites().pinnedMenus.includes(route);
  }

  togglePin(route: string, event: Event) {
    event.stopPropagation();
    this.prefs.togglePinnedMenu(route);
  }

  navigate(card: EmployeeCard) {
    this.router.navigate([card.route]);
  }
}
