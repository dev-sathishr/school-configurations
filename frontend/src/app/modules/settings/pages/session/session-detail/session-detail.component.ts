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
import { API } from '../../../../../core/api/endpoints';
import { SessionStatus } from '../../../../../core/constants/enums';

interface SessionActivity {
  id: string;
  module_code: string | null;
  route_path: string;
  accessed_at: string;
  exit_at: string | null;
  duration_seconds: number | null;
  action_type: string | null;
  record_id: string | null;
  resource: string | null;
}

interface ModuleBreakdown {
  module_code: string | null;
  total_seconds: number;
  nav_count: number;
  action_count: number;
  items: SessionActivity[];
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
  status: SessionStatus;
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

  private expandedModules = new Set<string>();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.load(id);
  }

  private load(id: string): void {
    this.loading = true;
    this.cs.getService({ url: API.sessions.detail(id) }).subscribe({
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

  // ── Stats ────────────────────────────────────────────────────────────────

  get sessionDurationSeconds(): number | null {
    if (!this.session) return null;
    const end = this.session.logout_at || this.session.revoked_at;
    const endMs = end ? new Date(end).getTime() : Date.now();
    return Math.floor((endMs - new Date(this.session.login_at).getTime()) / 1000);
  }

  get trackedTimeSeconds(): number {
    if (!this.session) return 0;
    return this.session.activity
      .filter((a) => !a.action_type)
      .reduce((sum, a) => sum + (a.duration_seconds ?? 0), 0);
  }

  get totalActions(): number {
    return this.session?.activity.filter((a) => !!a.action_type).length ?? 0;
  }

  // ── Module breakdown ─────────────────────────────────────────────────────

  get moduleBreakdown(): ModuleBreakdown[] {
    if (!this.session) return [];
    const map = new Map<string, ModuleBreakdown>();
    for (const a of this.session.activity) {
      const key = a.module_code ?? '__none__';
      if (!map.has(key)) {
        map.set(key, { module_code: a.module_code, total_seconds: 0, nav_count: 0, action_count: 0, items: [] });
      }
      const entry = map.get(key)!;
      if (a.action_type) {
        entry.action_count++;
      } else {
        entry.nav_count++;
        entry.total_seconds += a.duration_seconds ?? 0;
      }
      entry.items.push(a);
    }
    return Array.from(map.values()).sort((a, b) => b.total_seconds - a.total_seconds);
  }

  readonly ACTION_STYLES: Record<string, { pill: string; label: string }> = {
    CREATE: { pill: 'bg-green-500/10 text-green-700 dark:text-green-400', label: 'Created' },
    EDIT:   { pill: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',    label: 'Edited'  },
    DELETE: { pill: 'bg-red-500/10 text-red-700 dark:text-red-400',       label: 'Deleted' },
    IMPORT: { pill: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', label: 'Imported' },
    EXPORT: { pill: 'bg-purple-500/10 text-purple-700 dark:text-purple-400', label: 'Exported' },
  };

  actionStyle(actionType: string | null): { pill: string; label: string } {
    return this.ACTION_STYLES[actionType ?? ''] ?? { pill: 'bg-muted text-muted-foreground', label: actionType ?? '?' };
  }

  isExpanded(moduleCode: string | null): boolean {
    return this.expandedModules.has(moduleCode ?? '__none__');
  }

  toggleModule(moduleCode: string | null): void {
    const key = moduleCode ?? '__none__';
    if (this.expandedModules.has(key)) {
      this.expandedModules.delete(key);
    } else {
      this.expandedModules.add(key);
    }
  }

  // ── Grouped timeline (tree view) ─────────────────────────────────────────

  private expandedRows = new Set<string>();

  /** Each page-visit row paired with any actions that fired during that visit. */
  get groupedTimeline(): { nav: SessionActivity; actions: SessionActivity[] }[] {
    if (!this.session) return [];
    const navRows = this.session.activity.filter((a) => !a.action_type);
    const actionRows = this.session.activity.filter((a) => !!a.action_type);

    return navRows.map((nav) => {
      const start = new Date(nav.accessed_at).getTime();
      const end = nav.exit_at ? new Date(nav.exit_at).getTime() : Date.now();
      const actions = actionRows.filter((a) => {
        const t = new Date(a.accessed_at).getTime();
        return t >= start && t <= end + 2000; // 2s grace for same-ms events
      });
      return { nav, actions };
    });
  }

  isRowExpanded(id: string): boolean {
    return this.expandedRows.has(id);
  }

  toggleRow(id: string): void {
    if (this.expandedRows.has(id)) {
      this.expandedRows.delete(id);
    } else {
      this.expandedRows.add(id);
    }
  }

  expandAll(): void {
    this.groupedTimeline.filter((e) => e.actions.length).forEach((e) => this.expandedRows.add(e.nav.id));
  }

  collapseAll(): void {
    this.expandedRows.clear();
  }

  get hasExpandable(): boolean {
    return this.groupedTimeline.some((e) => e.actions.length > 0);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  formatDuration(seconds: number | null): string {
    if (seconds == null || seconds < 0) return '—';
    if (seconds === 0) return '< 1s';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  }

  get mapUrl(): string | null {
    if (!this.session?.latitude || !this.session?.longitude) return null;
    return `https://www.google.com/maps?q=${this.session.latitude},${this.session.longitude}`;
  }

  get avatarUrl(): string | null {
    if (!this.session?.profile_file_id || this.avatarFailed) return null;
    const token = localStorage.getItem('access_token');
    return `${environment.apiUrl}${API.files.detail(this.session.profile_file_id)}?token=${token}`;
  }

  get initial(): string {
    return (this.session?.full_name || this.session?.username || '?').charAt(0).toUpperCase();
  }

  onAvatarError(): void {
    this.avatarFailed = true;
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  askRevoke(): void {
    this.showRevokeConfirm = true;
  }

  confirmRevoke(): void {
    if (!this.session) return;
    this.revoking = true;
    this.cs.postService({ url: API.sessions.revoke(this.session.id), payload: {} }).subscribe({
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

  viewUserAnalytics(): void {
    if (!this.session) return;
    this.cs.navigate({ url: `/settings/session/users/${this.session.user_id}/analytics` });
  }

  back(): void {
    this.cs.navigate({ url: '/settings/session' });
  }
}
