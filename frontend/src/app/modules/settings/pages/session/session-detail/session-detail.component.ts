import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { PermissionService } from '../../../../../core/services/permission.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { ConfirmDialogComponent } from '../../../../../shared/components/confirm-dialog/confirm-dialog.component';

interface SessionActivity {
  id: string;
  module_code: string | null;
  route_path: string;
  accessed_at: string;
}

interface SessionDetail {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  profile_file_id: string | null;
  login_at: string;
  logout_at: string | null;
  last_activity_at: string;
  revoked_at: string | null;
  revoked_by_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  ua_summary: string | null;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  login_method: string;
  status: 'active' | 'ended' | 'revoked';
  activity: SessionActivity[];
}

@Component({
  selector: 'app-session-detail',
  templateUrl: './session-detail.component.html',
  imports: [CommonModule, DatePipe, ButtonComponent, LoaderComponent, BreadcrumbComponent, ConfirmDialogComponent],
})
export class SessionDetailComponent implements OnInit {
  private readonly cs = inject(CommonService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly ps = inject(PermissionService);

  session: SessionDetail | null = null;
  loading = false;
  showRevokeConfirm = false;
  revoking = false;
  avatarFailed = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.load(id);
  }

  private load(id: string): void {
    this.loading = true;
    this.cs.getService({ url: `/sessions/${id}` }).subscribe({
      next: (res: any) => {
        this.session = res.data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.cs.navigate({ url: '/settings/session' });
      },
    });
  }

  get mapUrl(): string | null {
    if (!this.session?.latitude || !this.session?.longitude) return null;
    return `https://www.google.com/maps?q=${this.session.latitude},${this.session.longitude}`;
  }

  get avatarUrl(): string | null {
    if (!this.session?.profile_file_id || this.avatarFailed) return null;
    const token = localStorage.getItem('access_token');
    return `${environment.apiUrl}/files/${this.session.profile_file_id}?token=${token}`;
  }

  get initial(): string {
    return (this.session?.full_name || this.session?.username || '?').charAt(0).toUpperCase();
  }

  onAvatarError(): void {
    this.avatarFailed = true;
  }

  askRevoke(): void {
    this.showRevokeConfirm = true;
  }

  confirmRevoke(): void {
    if (!this.session) return;
    this.revoking = true;
    this.cs.postService({ url: `/sessions/${this.session.id}/revoke`, payload: {} }).subscribe({
      next: () => {
        this.revoking = false;
        this.showRevokeConfirm = false;
        this.cs.showToastr({ type: 'success', message: 'Session revoked', description: 'User will be signed out on next request' });
        this.load(this.session!.id);
      },
      error: (err: any) => {
        this.revoking = false;
        this.showRevokeConfirm = false;
        this.cs.showToastr({ type: 'error', message: err.error?.message || 'Failed to revoke session' });
      },
    });
  }

  cancelRevoke(): void {
    this.showRevokeConfirm = false;
  }

  back(): void {
    this.cs.navigate({ url: '/settings/session' });
  }
}
