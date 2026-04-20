import { Component } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';

const STATUS_BADGES: Record<string, { label: string; class: string }> = {
  active:  { label: 'Active',  class: 'bg-green-500/10 text-green-700' },
  ended:   { label: 'Ended',   class: 'bg-muted text-muted-foreground' },
  revoked: { label: 'Revoked', class: 'bg-red-500/10 text-red-700' },
};

@Component({
  selector: 'app-session-list',
  templateUrl: './session-list.component.html',
  imports: [TableComponent, BreadcrumbComponent],
})
export class SessionListComponent extends BaseListComponent {
  apiUrl = '/sessions';
  routeBase = '/settings/session';

  columns: ColumnConfig[] = [
    { key: 'user_name', label: 'User', sortable: true, searchable: true, type: 'avatar', avatarKey: 'profile_file_id' },
    { key: 'device', label: 'Device' },
    { key: 'login_at', label: 'Login', sortable: true, type: 'date' },
    { key: 'duration', label: 'Duration' },
    { key: 'ip_address', label: 'IP', searchable: true },
    { key: 'location', label: 'Location', type: 'link', linkUrlKey: 'location_map_url' },
    { key: 'status', label: 'Status', sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
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
    mapped['duration'] = this.formatDuration(row.login_at, row.logout_at);
    mapped['location'] = row.location_label
      || (row.latitude != null && row.longitude != null
        ? `${Number(row.latitude).toFixed(4)}, ${Number(row.longitude).toFixed(4)}`
        : '-');
    mapped['location_map_url'] = row.latitude != null && row.longitude != null
      ? `https://www.google.com/maps?q=${row.latitude},${row.longitude}`
      : '';
    return mapped;
  };

  private formatDuration(loginAt: string, logoutAt: string | null): string {
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
