import { Component, ViewChild } from '@angular/core';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent],
})
export class UserListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  apiUrl = '/users';
  deleteUrl = '/users/delete-multiple';

  columns: ColumnConfig[] = [
    { key: 'u.full_name', label: 'Full Name', sortable: true, searchable: true },
    { key: 'u.username', label: 'Username', sortable: true, searchable: true },
    { key: 'u.email', label: 'Email', sortable: true, searchable: true },
    { key: 'u.phone', label: 'Phone', sortable: true, searchable: true },
    {
      key: 'u.role', label: 'Role', sortable: true, searchable: true, type: 'badge',
      badgeMap: {
        'super admin': { label: 'super admin', class: 'bg-red-500/10 text-red-700' },
        'admin': { label: 'admin', class: 'bg-purple-500/10 text-purple-700' },
        'principal': { label: 'principal', class: 'bg-blue-500/10 text-blue-700' },
        'teacher': { label: 'teacher', class: 'bg-green-500/10 text-green-700' },
        'clerk': { label: 'clerk', class: 'bg-yellow-500/10 text-yellow-800' },
        'student': { label: 'student', class: 'bg-cyan-500/10 text-cyan-700' },
        'parent': { label: 'parent', class: 'bg-orange-500/10 text-orange-700' },
      },
    },
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
    'u.phone': 'phone', 'u.role': 'role', 'u.is_active': 'is_active',
    'u.last_login': 'last_login', 'created_by_name': 'created_by_name',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['u.is_active'] = row.is_active ? 'Active' : 'Inactive';
    mapped['u.role'] = (row.role || '').replace(/_/g, ' ');
    mapped['u.last_login'] = row.last_login ? new Date(row.last_login).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }) : '-';
    return mapped;
  };

  constructor(private cs: CommonService) {}

  addNew() { this.cs.navigate({ url: '/settings/user/new' }); }
  editSelected(user: any) { this.cs.navigate({ url: `/settings/user/${user.id}/edit` }); }
}
