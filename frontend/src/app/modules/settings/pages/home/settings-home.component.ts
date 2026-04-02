import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

interface SettingsCard {
  icon: string;
  label: string;
  description: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-settings-home',
  templateUrl: './settings-home.component.html',
  imports: [AngularSvgIconModule],
})
export class SettingsHomeComponent {
  cards: SettingsCard[] = [
    {
      icon: 'assets/icons/heroicons/outline/cube.svg',
      label: 'Organization',
      description: 'Manage organizations and their details',
      route: '/settings/organization',
      color: 'bg-purple-500/10 text-purple-600',
    },
    {
      icon: 'assets/icons/heroicons/outline/bookmark.svg',
      label: 'Locations',
      description: 'Manage branches, campuses and locations',
      route: '/settings/location',
      color: 'bg-green-500/10 text-green-600',
    },
    {
      icon: 'assets/icons/heroicons/outline/users.svg',
      label: 'Users',
      description: 'Manage system users, roles and permissions',
      route: '/settings/user',
      color: 'bg-blue-500/10 text-blue-600',
    },
  ];

  constructor(private router: Router) {}

  navigate(card: SettingsCard) {
    this.router.navigate([card.route]);
  }
}
