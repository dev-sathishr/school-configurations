import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { AuthService, User } from '../../../../../core/services/auth.service';
import { ClickOutsideDirective } from '../../../../../shared/directives/click-outside.directive';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-profile-menu',
  templateUrl: './profile-menu.component.html',
  styleUrls: ['./profile-menu.component.css'],
  imports: [ClickOutsideDirective, RouterLink, AngularSvgIconModule],
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

  public currentUser: User | null = null;
  public profileImageUrl: string | null = null;
  public profileImageError = false;

  constructor(private authService: AuthService) {}

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
  }
}
