import { Component, inject, ViewChild } from '@angular/core';
import { TableComponent } from '../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CommonService } from '../../../../shared/services/common/common.service';

const STATUS_BADGES: Record<string, { label: string; class: string }> = {
  active:  { label: 'Active',  class: 'bg-green-500/10 text-green-700' },
  ended:   { label: 'Ended',   class: 'bg-muted text-muted-foreground' },
  revoked: { label: 'Revoked', class: 'bg-red-500/10 text-red-700' },
};

@Component({
  selector: 'app-my-sessions',
  templateUrl: './my-sessions.component.html',
  imports: [TableComponent, ButtonComponent, ConfirmDialogComponent],
})
export class MySessionsComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  private readonly cs = inject(CommonService);

  apiUrl = '/sessions/me';

  columns: ColumnConfig[] = [
    { key: 'device', label: 'Device', sortable: false, searchable: false },
    { key: 'ip_address', label: 'IP', searchable: true },
    { key: 'location', label: 'Location', type: 'link', linkUrlKey: 'location_map_url' },
    { key: 'login_at', label: 'Login', sortable: true, type: 'date' },
    { key: 'last_activity_at', label: 'Last Activity', sortable: true, type: 'date' },
    { key: 'status', label: 'Status', sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
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

  showConfirm = false;
  revoking = false;

  askRevokeOthers(): void {
    this.showConfirm = true;
  }

  confirmRevokeOthers(): void {
    this.revoking = true;
    this.cs.postService({ url: '/sessions/me/revoke-others', payload: {} }).subscribe({
      next: (res: any) => {
        this.revoking = false;
        this.showConfirm = false;
        const count = res?.data?.revoked_count ?? 0;
        this.cs.showToastr({
          type: 'success',
          message: count > 0 ? `Signed out ${count} other device(s)` : 'No other active sessions',
        });
        this.table?.reloadCurrentPage();
      },
      error: (err: any) => {
        this.revoking = false;
        this.showConfirm = false;
        this.cs.showToastr({ type: 'error', message: err?.error?.message || 'Failed to sign out other devices' });
      },
    });
  }

  cancelRevokeOthers(): void {
    this.showConfirm = false;
  }
}
