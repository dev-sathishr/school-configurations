import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { PermissionService } from '../../../../core/services/permission.service';

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
  imports: [AngularSvgIconModule],
})
export class SettingsHomeComponent implements OnInit {
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
  ];

  cards: SettingsCard[] = [];

  constructor(private router: Router, private permissionService: PermissionService) {}

  ngOnInit(): void {
    this.cards = this.allCards.filter((card) => this.permissionService.hasAnyPermission(card.moduleCode));
  }

  navigate(card: SettingsCard) {
    this.router.navigate([card.route]);
  }
}
