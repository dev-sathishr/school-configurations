import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TableComponent } from '../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { CommonService } from '../../../../shared/services/common/common.service';
import { API } from '../../../../core/api/endpoints';
import { SESSION_STATUS_BADGES } from '../../../../core/constants/enums';
import { ConfirmService } from '../../../../shared/services/confirm/confirm.service';
import { finalize } from 'rxjs';

interface ModuleUsage {
  module_code: string;
  total_seconds: number;
  page_visits: number;
  actions: number;
  session_count: number;
}

interface ActionBreakdown {
  action_type: string;
  resource: string | null;
  count: number;
}

interface HourlyActivity {
  hour_of_day: number;
  event_count: number;
}

interface RecentSession {
  id: string;
  login_at: string;
  logout_at: string | null;
  status: string;
  session_seconds: number;
  page_count: number;
  action_count: number;
  user_agent: string | null;
  ua_summary?: string;
}

interface Totals {
  total_sessions: number;
  total_seconds: number;
  total_pages: number;
  total_actions: number;
}

interface Analytics {
  module_usage: ModuleUsage[];
  action_breakdown: ActionBreakdown[];
  hourly_activity: HourlyActivity[];
  recent_sessions: RecentSession[];
  totals: Totals;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-500/10 text-green-700 dark:text-green-400',
  EDIT:   'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  DELETE: 'bg-red-500/10 text-red-700 dark:text-red-400',
  IMPORT: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  EXPORT: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
};

@Component({
  selector: 'app-my-sessions',
  templateUrl: './my-sessions.component.html',
  imports: [CommonModule, DatePipe, TableComponent, ButtonComponent, LoaderComponent],
})
export class MySessionsComponent implements OnInit {
  @ViewChild(TableComponent) table!: TableComponent;

  private readonly cs = inject(CommonService);
  private readonly confirm = inject(ConfirmService);
  private readonly cdr = inject(ChangeDetectorRef);

  // ── Sessions table ────────────────────────────────────────────────────────

  apiUrl = API.sessions.mine;

  columns: ColumnConfig[] = [
    { key: 'device', label: 'Device', sortable: false, searchable: false },
    { key: 'ip_address', label: 'IP', searchable: true },
    { key: 'location', label: 'Location', type: 'link', linkUrlKey: 'location_map_url' },
    { key: 'login_at', label: 'Login', sortable: true, type: 'date' },
    { key: 'last_activity_at', label: 'Last Activity', sortable: true, type: 'date' },
    { key: 'status', label: 'Status', sortable: true, type: 'badge', badgeMap: SESSION_STATUS_BADGES },
  ];

  displayKeyMap: Record<string, string> = {
    'login_at': 'login_at',
    'last_activity_at': 'last_activity_at',
    'status': 'status',
    'ip_address': 'ip_address',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['device'] = row.ua_summary || row.user_agent || '—';
    mapped['ip_address'] = row.ip_address || '—';
    mapped['location'] = row.location_label
      || (row.latitude != null && row.longitude != null
        ? `${Number(row.latitude).toFixed(4)}, ${Number(row.longitude).toFixed(4)}`
        : '—');
    mapped['location_map_url'] = row.latitude != null && row.longitude != null
      ? `https://www.google.com/maps?q=${row.latitude},${row.longitude}`
      : '';
    return mapped;
  };

  activeTab: 'sessions' | 'activity' = 'sessions';

  revoking = false;

  async askRevokeOthers(): Promise<void> {
    if (this.revoking) return;
    const ok = await this.confirm.ask({
      title: 'Sign out other devices?',
      message: 'Every active session for your account except this browser will be revoked. You will stay signed in here.',
      confirmText: 'Sign out others',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!ok || this.revoking) return;

    this.revoking = true;
    this.cs.postService({ url: API.sessions.revokeOthers, payload: {} })
      .pipe(finalize(() => { this.revoking = false; }))
      .subscribe({
        next: (res: any) => {
          const count = res?.data?.revoked_count ?? 0;
          this.cs.showToastr({
            type: 'success',
            message: count > 0 ? `Signed out ${count} other device(s)` : 'No other active sessions',
          });
          setTimeout(() => this.table?.reloadCurrentPage(), 0);
        },
        error: (err: any) => {
          this.cs.showToastr({ type: 'error', message: err?.error?.message || 'Failed to sign out other devices' });
        },
      });
  }

  // ── Activity analytics ────────────────────────────────────────────────────

  analytics: Analytics | null = null;
  analyticsLoading = false;
  readonly maxBarHeight = 60;

  ngOnInit(): void {
    this.loadAnalytics();
  }

  private loadAnalytics(): void {
    this.analyticsLoading = true;
    this.cs.getService({ url: API.sessions.myAnalytics }).subscribe({
      next: (res: any) => {
        this.analytics = res.data;
        this.analyticsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.analyticsLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

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

  actionColor(type: string): string {
    return ACTION_COLORS[type] ?? 'bg-muted text-muted-foreground';
  }

  barHeight(count: number): number {
    if (!this.analytics?.hourly_activity.length) return 0;
    const max = Math.max(...this.analytics.hourly_activity.map((h) => h.event_count), 1);
    return Math.round((count / max) * this.maxBarHeight);
  }

  hourLabel(h: number): string {
    if (h === 0) return '12am';
    if (h === 12) return '12pm';
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  }

  allHours(): number[] {
    return Array.from({ length: 24 }, (_, i) => i);
  }

  eventCountForHour(h: number): number {
    return this.analytics?.hourly_activity.find((x) => x.hour_of_day === h)?.event_count ?? 0;
  }

  topPercent(usage: ModuleUsage): number {
    if (!this.analytics?.module_usage.length) return 0;
    const max = Math.max(...this.analytics.module_usage.map((m) => m.total_seconds), 1);
    return Math.round((usage.total_seconds / max) * 100);
  }

  statusClass(status: string): string {
    return status === 'active' ? 'bg-green-500/10 text-green-700 dark:text-green-400'
      : status === 'revoked' ? 'bg-red-500/10 text-red-700 dark:text-red-400'
      : 'bg-muted text-muted-foreground';
  }
}
