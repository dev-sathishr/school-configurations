import { ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';
import { API } from '../../../../../core/api/endpoints';
import { SESSION_STATUS_BADGES } from '../../../../../core/constants/enums';

interface OnlineUser {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  profile_file_id: string | null;
  ip_address: string | null;
  ua_summary: string | null;
  login_at: string;
  last_activity_at: string;
  current_module: string | null;
  current_route: string | null;
  current_page_since: string | null;
  seconds_on_page: number | null;
  session_seconds: number;
}

@Component({
  selector: 'app-session-list',
  templateUrl: './session-list.component.html',
  imports: [CommonModule, DatePipe, FormsModule, TableComponent, BreadcrumbComponent, ButtonComponent, LoaderComponent],
})
export class SessionListComponent extends BaseListComponent implements OnDestroy {
  apiUrl = API.sessions.base;
  routeBase = '/settings/session';

  columns: ColumnConfig[] = [
    { key: 'user_name', label: 'User', sortable: true, searchable: true, type: 'avatar', avatarKey: 'profile_file_id' },
    { key: 'device', label: 'Device' },
    { key: 'login_at', label: 'Login', sortable: true, type: 'date' },
    { key: 'duration', label: 'Duration' },
    { key: 'ip_address', label: 'IP', searchable: true },
    { key: 'location', label: 'Location', type: 'link', linkUrlKey: 'location_map_url' },
    { key: 'status', label: 'Status', sortable: true, type: 'badge', badgeMap: SESSION_STATUS_BADGES },
    { key: 'last_activity_at', label: 'Last Activity', sortable: true, type: 'date' },
  ];

  displayKeyMap: Record<string, string> = {
    'user_name': 'full_name',
    'login_at': 'login_at',
    'ip_address': 'ip_address',
    'status': 'status',
    'last_activity_at': 'last_activity_at',
    'profile_file_id': 'profile_file_id',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['user_name'] = row.full_name || row.username || '-';
    mapped['device'] = row.ua_summary || '-';
    mapped['ip_address'] = row.ip_address || '-';
    mapped['duration'] = this.calcDuration(row.login_at, row.logout_at);
    mapped['location'] = row.location_label
      || (row.latitude != null && row.longitude != null
        ? `${Number(row.latitude).toFixed(4)}, ${Number(row.longitude).toFixed(4)}`
        : '-');
    mapped['location_map_url'] = row.latitude != null && row.longitude != null
      ? `https://www.google.com/maps?q=${row.latitude},${row.longitude}`
      : '';
    return mapped;
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────

  private readonly cdr = inject(ChangeDetectorRef);

  activeTab: 'all' | 'online' | 'analytics' = 'all';
  onlineUsers: OnlineUser[] = [];
  onlineLoading = false;
  private avatarErrors = new Set<string>();
  private pollTimer: any = null;
  private readonly POLL_MS = 30_000;

  switchTab(tab: 'all' | 'online' | 'analytics'): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    clearInterval(this.pollTimer);
    this.pollTimer = null;
    if (tab === 'online') {
      this.loadOnlineUsers();
      this.pollTimer = setInterval(() => this.loadOnlineUsers(), this.POLL_MS);
    } else if (tab === 'analytics' && !this.adminAnalytics) {
      this.loadAdminAnalytics();
    }
  }

  loadOnlineUsers(): void {
    this.onlineLoading = true;
    this.cs.getService({ url: API.sessions.online }).subscribe({
      next: (res: any) => {
        this.onlineUsers = res.data ?? [];
        this.onlineLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.onlineLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getAvatarUrl(u: OnlineUser): string | null {
    if (!u.profile_file_id || this.avatarErrors.has(u.id)) return null;
    const token = localStorage.getItem('access_token');
    return `${environment.apiUrl}${API.files.detail(u.profile_file_id)}?token=${token}`;
  }

  onAvatarError(u: OnlineUser): void {
    this.avatarErrors.add(u.id);
  }

  formatSeconds(seconds: number | null): string {
    if (seconds == null || seconds < 0) return '—';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  }

  // ── Admin Analytics tab ───────────────────────────────────────────────────

  adminAnalytics: {
    live: { active_sessions: number; active_users: number };
    sessions_per_day: { day: string; session_count: number; user_count: number }[];
    top_modules: { module_code: string; total_seconds: number; visit_count: number }[];
    top_users: { id: string; full_name: string; username: string; email: string; profile_file_id: string | null; session_count: number; action_count: number; page_count: number; total_seconds: number }[];
    totals: { sessions_today: number; sessions_this_week: number; avg_session_seconds: number };
  } | null = null;
  analyticsLoading = false;

  retentionDays: number | null = null;
  retentionSaving = false;
  purgingNow = false;

  private topUserAvatarErrors = new Set<string>();

  loadAdminAnalytics(): void {
    this.analyticsLoading = true;
    this.cs.getService({ url: API.sessions.analytics }).subscribe({
      next: (res: any) => {
        this.adminAnalytics = res.data;
        this.analyticsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.analyticsLoading = false;
        this.cdr.detectChanges();
      },
    });
    this.cs.getService({ url: API.sessions.retention }).subscribe({
      next: (res: any) => { this.retentionDays = res.data?.days ?? 90; this.cdr.detectChanges(); },
      error: () => {},
    });
  }

  saveRetention(): void {
    if (!this.retentionDays) return;
    this.retentionSaving = true;
    this.cs.putService({ url: API.sessions.retention, payload: { days: this.retentionDays } }).subscribe({
      next: () => {
        this.retentionSaving = false;
        this.cs.showToastr({ type: 'success', message: 'Retention settings saved' });
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.retentionSaving = false;
        this.cs.showToastr({ type: 'error', message: err?.error?.message || 'Failed to save' });
        this.cdr.detectChanges();
      },
    });
  }

  purgeNow(): void {
    this.purgingNow = true;
    this.cs.postService({ url: API.sessions.purge, payload: {} }).subscribe({
      next: (res: any) => {
        this.purgingNow = false;
        const count = res?.data?.purged_count ?? 0;
        this.cs.showToastr({ type: 'success', message: `${count} old session(s) purged` });
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.purgingNow = false;
        this.cs.showToastr({ type: 'error', message: err?.error?.message || 'Purge failed' });
        this.cdr.detectChanges();
      },
    });
  }

  exportCsv(): void {
    const token = localStorage.getItem('access_token');
    window.open(`${environment.apiUrl}${API.sessions.export}?token=${token}`, '_blank');
  }

  getTopUserAvatar(u: { id: string; profile_file_id: string | null }): string | null {
    if (!u.profile_file_id || this.topUserAvatarErrors.has(u.id)) return null;
    const token = localStorage.getItem('access_token');
    return `${environment.apiUrl}${API.files.detail(u.profile_file_id)}?token=${token}`;
  }

  onTopUserAvatarError(id: string): void {
    this.topUserAvatarErrors.add(id);
  }

  viewUserAnalytics(userId: string): void {
    this.cs.navigate({ url: `/settings/session/users/${userId}/analytics` });
  }

  maxDayCount(): number {
    return Math.max(...(this.adminAnalytics?.sessions_per_day.map((d) => d.session_count) ?? [1]), 1);
  }

  dayBarHeight(count: number): number {
    return Math.round((count / this.maxDayCount()) * 60);
  }

  maxModuleSeconds(): number {
    return Math.max(...(this.adminAnalytics?.top_modules.map((m) => m.total_seconds) ?? [1]), 1);
  }

  modulePercent(seconds: number): number {
    return Math.round((seconds / this.maxModuleSeconds()) * 100);
  }

  formatDuration(seconds: number): string {
    if (!seconds || seconds < 0) return '—';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  }

  ngOnDestroy(): void {
    clearInterval(this.pollTimer);
  }

  // ── Shared helpers ────────────────────────────────────────────────────────

  private calcDuration(loginAt: string, logoutAt: string | null): string {
    if (!loginAt) return '-';
    const start = new Date(loginAt).getTime();
    const end = logoutAt ? new Date(logoutAt).getTime() : Date.now();
    const ms = Math.max(0, end - start);
    const mins = Math.floor(ms / 60_000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours < 24) return `${hours}h ${remMins}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
}
