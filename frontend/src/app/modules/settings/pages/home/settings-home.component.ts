import { Component, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { PermissionService } from '../../../../core/services/permission.service';
import { UserPreferencesService } from '../../../../core/services/user-preferences.service';
import { sortByPinnedAndUsage } from '../../../../shared/utils/sort-by-pinned-and-usage';

interface SettingsCard {
  icon: string;
  label: string;
  description: string;
  route: string;
  color: string;
  moduleCode: string;
}

@Component({
  selector: 'app-settings-home',
  templateUrl: './settings-home.component.html',
  imports: [AngularSvgIconModule, NgClass],
})
export class SettingsHomeComponent implements OnInit {
  private prefs = inject(UserPreferencesService);

  private allCards: SettingsCard[] = [
    {
      icon: 'assets/icons/heroicons/outline/cube.svg',
      label: 'Organization',
      description: 'Manage organizations and their details',
      route: '/settings/organization',
      color: 'bg-purple-500/10 text-purple-600',
      moduleCode: 'ORGANIZATIONS',
    },
    {
      icon: 'assets/icons/heroicons/outline/bookmark.svg',
      label: 'Locations',
      description: 'Manage branches, campuses and locations',
      route: '/settings/location',
      color: 'bg-green-500/10 text-green-600',
      moduleCode: 'LOCATIONS',
    },
    {
      icon: 'assets/icons/heroicons/outline/users.svg',
      label: 'Users',
      description: 'Manage system users, roles and permissions',
      route: '/settings/user',
      color: 'bg-blue-500/10 text-blue-600',
      moduleCode: 'USERS',
    },
    {
      icon: 'assets/icons/heroicons/outline/cube.svg',
      label: 'Modules',
      description: 'Manage application modules',
      route: '/settings/module',
      color: 'bg-indigo-500/10 text-indigo-600',
      moduleCode: 'MODULES',
    },
    {
      icon: 'assets/icons/heroicons/outline/bookmark.svg',
      label: 'Menus',
      description: 'Manage navigation menus and assign modules',
      route: '/settings/menu',
      color: 'bg-teal-500/10 text-teal-600',
      moduleCode: 'MENUS',
    },
    {
      icon: 'assets/icons/heroicons/outline/users.svg',
      label: 'Groups',
      description: 'Manage user groups, menu access and permissions',
      route: '/settings/group',
      color: 'bg-orange-500/10 text-orange-600',
      moduleCode: 'GROUPS',
    },
    {
      icon: 'assets/icons/heroicons/outline/shield-check.svg',
      label: 'Permissions',
      description: 'Manage permission types (View, Create, Edit, Delete)',
      route: '/settings/permission',
      color: 'bg-red-500/10 text-red-600',
      moduleCode: 'PERMISSIONS',
    },
    {
      icon: 'assets/icons/heroicons/outline/shield-exclamation.svg',
      label: 'Sessions',
      description: 'Monitor active sessions, login history and activity',
      route: '/settings/session',
      color: 'bg-yellow-500/10 text-yellow-600',
      moduleCode: 'SESSIONS',
    },
    {
      icon: 'assets/icons/heroicons/outline/bookmark.svg',
      label: 'Academic Years',
      description: 'Set up school calendars per location — one default per year',
      route: '/settings/academic-year',
      color: 'bg-pink-500/10 text-pink-600',
      moduleCode: 'ACADEMIC_YEARS',
    },
  ];

  cards = signal<SettingsCard[]>([]);

  constructor(private router: Router, private permissionService: PermissionService) {
    // Re-sort on pin changes. Usage is read untracked — usage increments on
    // navigation must not cause a reorder while the user is looking at the page.
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

  navigate(card: SettingsCard) {
    this.router.navigate([card.route]);
  }
}
