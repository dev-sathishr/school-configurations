import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { environment } from 'src/environments/environment';
import { API } from '../../../../core/api/endpoints';

@Component({
  selector: 'app-no-access',
  standalone: true,
  imports: [AngularSvgIconModule],
  template: `
    <div class="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <svg-icon src="assets/icons/heroicons/outline/shield-exclamation.svg" [svgClass]="'h-16 w-16 text-muted-foreground/30'"></svg-icon>
      <h2 class="text-foreground mt-4 text-xl font-semibold">No Access</h2>
      <p class="text-muted-foreground mt-2 max-w-md text-sm">
        Your account doesn't have any module permissions assigned yet.
        Use the chat to contact your administrator for access.
      </p>
      <div class="mt-6 flex gap-3">
        <button (click)="retry()" class="bg-primary text-primary-foreground cursor-pointer rounded-lg px-6 py-2 text-sm font-medium">
          Retry
        </button>
        <button (click)="logout()" class="text-muted-foreground cursor-pointer rounded-lg border border-muted px-6 py-2 text-sm font-medium hover:text-foreground">
          Sign Out
        </button>
      </div>
    </div>
  `,
})
export class NoAccessComponent implements OnInit, OnDestroy {
  private eventSource?: EventSource;

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    const menus = this.permissionService.menus;
    if (menus.length > 0 && menus[0].route_path) {
      this.router.navigate([menus[0].route_path]);
      return;
    }

    this.listenForApproval();
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  private listenForApproval(): void {
    const token = this.authService.getToken();
    if (!token) return;

    const url = `${environment.apiUrl}${API.notifications.stream}?token=${token}`;

    this.ngZone.runOutsideAngular(() => {
      this.eventSource = new EventSource(url);

      this.eventSource.addEventListener('notification', (event: any) => {
        const data = JSON.parse(event.data);
        if (data.notification?.type === 'permission_approved') {
          this.ngZone.run(() => {
            this.permissionService.load().subscribe(() => {
              const menus = this.permissionService.menus;
              if (menus.length > 0 && menus[0].route_path) {
                this.router.navigate([menus[0].route_path]);
              }
            });
          });
        }
      });

      this.eventSource.onerror = () => {
        this.eventSource?.close();
        setTimeout(() => this.listenForApproval(), 5000);
      };
    });
  }

  retry(): void {
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
