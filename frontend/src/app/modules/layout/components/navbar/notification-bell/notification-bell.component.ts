import { ChangeDetectorRef, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { ToastService } from '../../../../../shared/services/toast/toast.service';
import { environment } from 'src/environments/environment';
import { API } from '../../../../../core/api/endpoints';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  data: any;
  created_at: string;
}

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [AngularSvgIconModule],
  template: `
    <div class="relative">
      <button
        (click)="toggle()"
        class="text-muted-foreground hover:text-foreground hover:bg-muted relative hidden rounded-md p-2 transition-colors md:inline-flex">
        <svg-icon src="assets/icons/heroicons/outline/bell.svg" [svgClass]="'h-5 w-5'"></svg-icon>
        @if (unreadCount > 0) {
          <span class="bg-red-500 absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        }
      </button>

      @if (isOpen) {
        <div class="bg-background border-border absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border shadow-lg">
          <!-- Header -->
          <div class="border-border flex items-center justify-between border-b px-4 py-3">
            <h3 class="text-foreground text-sm font-semibold">Notifications</h3>
            @if (unreadCount > 0) {
              <button (click)="markAllRead()" class="text-primary cursor-pointer text-xs font-medium hover:underline">
                Mark all read
              </button>
            }
          </div>

          <!-- Notifications list -->
          <div class="max-h-80 overflow-y-auto">
            @if (notifications.length === 0) {
              <div class="px-4 py-8 text-center">
                <svg-icon src="assets/icons/heroicons/outline/bell.svg" [svgClass]="'mx-auto h-8 w-8 text-muted-foreground/20'"></svg-icon>
                <p class="text-muted-foreground mt-2 text-xs">No notifications yet</p>
              </div>
            }
            @for (n of notifications; track n.id) {
              <div
                (click)="toggleExpand(n)"
                class="border-border cursor-pointer border-b px-4 py-3 transition-colors last:border-b-0"
                [class.bg-primary/5]="!n.is_read"
                [class.hover:bg-muted/50]="true">
                <div class="flex items-start gap-3">
                  <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    [class.bg-blue-500/10]="n.type === 'permission_request'"
                    [class.bg-green-500/10]="n.type === 'permission_approved'"
                    [class.bg-muted]="n.type !== 'permission_request' && n.type !== 'permission_approved'">
                    <svg-icon
                      [src]="n.type === 'permission_request' ? 'assets/icons/heroicons/outline/shield-check.svg' : 'assets/icons/heroicons/outline/bell.svg'"
                      [svgClass]="'h-4 w-4 ' + (n.type === 'permission_request' ? 'text-blue-600' : n.type === 'permission_approved' ? 'text-green-600' : 'text-muted-foreground')">
                    </svg-icon>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-foreground text-xs font-semibold">{{ n.title }}</p>
                    <p class="text-muted-foreground mt-0.5 text-xs" [class.line-clamp-2]="expandedId !== n.id">{{ n.message }}</p>
                    <p class="text-muted-foreground/60 mt-1 text-[10px]">{{ timeAgo(n.created_at) }}</p>
                  </div>
                  @if (!n.is_read) {
                    <div class="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full"></div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  isOpen = false;
  expandedId: string | null = null;
  private eventSource?: EventSource;

  constructor(
    private cs: CommonService,
    private authService: AuthService,
    private toastService: ToastService,
    private elRef: ElementRef,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.connectSSE();
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  private connectSSE(): void {
    const token = this.authService.getToken();
    if (!token) return;

    const url = `${environment.apiUrl}${API.notifications.stream}?token=${token}`;

    this.ngZone.runOutsideAngular(() => {
      this.eventSource = new EventSource(url);

      this.eventSource.addEventListener('unread_count', (event: any) => {
        const data = JSON.parse(event.data);
        this.ngZone.run(() => {
          this.unreadCount = data.unread_count || 0;
          this.cdr.detectChanges();
        });
      });

      this.eventSource.addEventListener('notification', (event: any) => {
        const data = JSON.parse(event.data);
        this.ngZone.run(() => {
          this.unreadCount = data.unread_count || 0;
          // If dropdown is open, add new notification to the top
          if (this.isOpen && data.notification) {
            this.notifications.unshift(data.notification);
          }
          // Show toastr popup at bottom-right like Teams notification
          if (data.notification) {
            this.toastService.show({
              type: 'info',
              message: data.notification.title,
              description: data.notification.message,
              position: 'bottom-right',
              duration: 6000,
            });
          }
          this.cdr.detectChanges();
        });
      });

      this.eventSource.onerror = () => {
        this.eventSource?.close();
        // Reconnect after 5 seconds
        setTimeout(() => this.connectSSE(), 5000);
      };
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadNotifications();
    }
  }

  private loadNotifications(): void {
    this.cs.getService({ url: API.notifications.base }).subscribe({
      next: (res: any) => {
        this.notifications = res.notifications || [];
        this.unreadCount = res.unread_count || 0;
        this.cdr.detectChanges();
      },
    });
  }

  toggleExpand(n: Notification): void {
    this.expandedId = this.expandedId === n.id ? null : n.id;
    this.markRead(n);
  }

  markRead(n: Notification): void {
    if (!n.is_read) {
      n.is_read = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.cs.putService({ url: API.notifications.markRead(n.id), payload: {} }).subscribe();
    }
  }

  markAllRead(): void {
    this.notifications.forEach(n => n.is_read = true);
    this.unreadCount = 0;
    this.cs.putService({ url: API.notifications.markAllRead, payload: {} }).subscribe();
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
