import { Component } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';

@Component({
  selector: 'app-permission-list',
  templateUrl: './permission-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class PermissionListComponent extends BaseListComponent {
  apiUrl = '/permissions';
  override deleteUrl = '/permissions/delete-multiple';
  routeBase = '/settings/permission';

  columns: ColumnConfig[] = [
    { key: 'p.name', label: 'Name', sortable: true, searchable: true },
    { key: 'p.code', label: 'Code', sortable: true, searchable: true },
    { key: 'p.description', label: 'Description', searchable: true },
    {
      key: 'p.is_active', label: 'Status', sortable: true, type: 'badge',
      badgeMap: {
        'Active': { label: 'Active', class: 'bg-green-500/10 text-green-700' },
        'Inactive': { label: 'Inactive', class: 'bg-red-500/10 text-red-700' },
      },
    },
  ];

  displayKeyMap: Record<string, string> = {
    'p.name': 'name', 'p.code': 'code', 'p.description': 'description',
    'p.is_active': 'is_active',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['p.is_active'] = row.is_active ? 'Active' : 'Inactive';
    mapped['p.description'] = row.description || '-';
    return mapped;
  };
}
