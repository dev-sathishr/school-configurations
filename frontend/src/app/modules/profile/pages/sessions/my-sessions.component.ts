import { Component, inject, ViewChild } from '@angular/core';
import { TableComponent } from '../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CommonService } from '../../../../shared/services/common/common.service';
import { API } from '../../../../core/api/endpoints';
import { SESSION_STATUS_BADGES } from '../../../../core/constants/enums';
import { ConfirmService } from '../../../../shared/services/confirm/confirm.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-my-sessions',
  templateUrl: './my-sessions.component.html',
  imports: [TableComponent, ButtonComponent],
})
export class MySessionsComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  private readonly cs = inject(CommonService);
  private readonly confirm = inject(ConfirmService);

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
}
