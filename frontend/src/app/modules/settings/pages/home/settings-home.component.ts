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
      icon: 'assets/icons/heroicons/outline/users.svg',
      label: 'Users',
      description: 'Manage system users, roles and permissions',
      route: '/settings/users',
      color: 'bg-blue-500/10 text-blue-600',
    },
  ];

  constructor(private router: Router) {}

  navigate(card: SettingsCard) {
    this.router.navigate([card.route]);
  }
}
