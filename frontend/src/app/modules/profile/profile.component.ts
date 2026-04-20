import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

interface ProfileSection {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AngularSvgIconModule],
})
export class ProfileComponent {
  public sections: ProfileSection[] = [
    { label: 'Overview', route: 'overview', icon: './assets/icons/heroicons/outline/user-circle.svg' },
    { label: 'Appearance', route: 'appearance', icon: './assets/icons/heroicons/outline/sun.svg' },
    { label: 'Table Preferences', route: 'tables', icon: './assets/icons/heroicons/outline/table-cells.svg' },
    { label: 'Favorites & Pins', route: 'favorites', icon: './assets/icons/heroicons/outline/bookmark.svg' },
    { label: 'My Sessions', route: 'sessions', icon: './assets/icons/heroicons/outline/shield-check.svg' },
  ];
}
