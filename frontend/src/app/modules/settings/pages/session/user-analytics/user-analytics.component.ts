import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { API } from '../../../../../core/api/endpoints';

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
  selector: 'app-user-analytics',
  templateUrl: './user-analytics.component.html',
  imports: [CommonModule, DatePipe, LoaderComponent, ButtonComponent, BreadcrumbComponent],
})
export class UserAnalyticsComponent implements OnInit {
  private readonly cs = inject(CommonService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly location = inject(Location);

  loading = false;
  analytics: Analytics | null = null;
  userId = '';

  readonly maxBarHeight = 60;

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId') ?? '';
    if (this.userId) this.load();
  }

  private load(): void {
    this.loading = true;
    this.cs.getService({ url: API.sessions.userAnalytics(this.userId) }).subscribe({
      next: (res: any) => {
        this.analytics = res.data;
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

  back(): void {
    this.location.back();
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

  allHours(): number[] {
    return Array.from({ length: 24 }, (_, i) => i);
  }

  eventCountForHour(h: number): number {
    return this.analytics?.hourly_activity.find((x) => x.hour_of_day === h)?.event_count ?? 0;
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
