import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionService } from '../../../../core/services/permission.service';

@Component({
  selector: 'app-no-access',
  standalone: true,
  imports: [AngularSvgIconModule],
  template: `
    <div class="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <svg-icon src="assets/icons/heroicons/outline/shield-exclamation.svg" [svgClass]="'h-16 w-16 text-muted-foreground/30'"></svg-icon>
      <h2 class="text-foreground mt-4 text-xl font-semibold">No Access</h2>
      <p class="text-muted-foreground mt-2 max-w-md text-sm">
        Your account doesn't have any module permissions assigned yet. Please contact your administrator to get access.
      </p>
      <div class="mt-6 flex gap-3">
        <button (click)="retry()" class="bg-muted text-foreground cursor-pointer rounded-lg px-6 py-2 text-sm font-medium hover:bg-muted/80">
          Retry
        </button>
        <button (click)="logout()" class="bg-primary text-primary-foreground cursor-pointer rounded-lg px-6 py-2 text-sm font-medium">
          Sign Out
        </button>
      </div>
    </div>
  `,
})
export class NoAccessComponent implements OnInit {
  constructor(private authService: AuthService, private permissionService: PermissionService, private router: Router) {}

  ngOnInit(): void {
    // If user actually has menus (e.g. page refresh after permissions were granted), redirect
    const menus = this.permissionService.menus;
    if (menus.length > 0 && menus[0].route_path) {
      this.router.navigate([menus[0].route_path]);
    }
  }

  retry(): void {
    // Re-fetch permissions from server and redirect if access was granted
    this.permissionService.load().subscribe(() => {
      const menus = this.permissionService.menus;
      if (menus.length > 0 && menus[0].route_path) {
        this.router.navigate([menus[0].route_path]);
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
