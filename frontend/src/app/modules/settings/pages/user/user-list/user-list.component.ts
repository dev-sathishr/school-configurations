import { Component, ViewChild } from '@angular/core';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { PermissionService } from '../../../../../core/services/permission.service';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class UserListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  apiUrl = '/users';
  deleteUrl = '/users/delete-multiple';

  columns: ColumnConfig[] = [
    { key: 'u.full_name', label: 'Full Name', sortable: true, searchable: true, type: 'avatar', avatarKey: 'profile_file_id' },
    { key: 'u.username', label: 'Username', sortable: true, searchable: true },
    { key: 'u.email', label: 'Email', sortable: true, searchable: true },
    { key: 'u.phone', label: 'Phone', sortable: true, searchable: true },
    { key: 'g.name', label: 'Group', sortable: true },
    {
      key: 'u.is_active', label: 'Status', sortable: true, type: 'badge',
      badgeMap: {
        'Active': { label: 'Active', class: 'bg-green-500/10 text-green-700' },
        'Inactive': { label: 'Inactive', class: 'bg-red-500/10 text-red-700' },
      },
    },
    { key: 'u.last_login', label: 'Last Login', sortable: true },
    { key: 'created_by_name', label: 'Created By' },
  ];

  displayKeyMap: Record<string, string> = {
    'u.full_name': 'full_name', 'u.username': 'username', 'u.email': 'email',
    'u.phone': 'phone', 'g.name': 'group_name', 'u.is_active': 'is_active',
    'u.last_login': 'last_login', 'created_by_name': 'created_by_name',
    'profile_file_id': 'profile_file_id',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['u.is_active'] = row.is_active ? 'Active' : 'Inactive';
    mapped['g.name'] = row.group_name || '-';
    mapped['u.phone'] = row.phone ? `${row.phone_code || '+91'} ${row.phone}` : '-';
    mapped['u.last_login'] = row.last_login ? new Date(row.last_login).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }) : '-';
    return mapped;
  };

  constructor(private cs: CommonService, public ps: PermissionService) {}

  addNew() { this.cs.navigate({ url: '/settings/user/new' }); }
  editSelected(user: any) { this.cs.navigate({ url: `/settings/user/${user.id}/edit` }); }
}
