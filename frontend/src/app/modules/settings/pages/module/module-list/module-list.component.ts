import { Component } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';

@Component({
  selector: 'app-module-list',
  templateUrl: './module-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class ModuleListComponent extends BaseListComponent {
  apiUrl = '/modules';
  override deleteUrl = '/modules/delete-multiple';
  routeBase = '/settings/module';

  columns: ColumnConfig[] = [
    { key: 'm.name', label: 'Name', sortable: true, searchable: true },
    { key: 'm.code', label: 'Code', sortable: true, searchable: true },
    { key: 'm.route_path', label: 'Route Path', sortable: true },
    { key: 'm.display_order', label: 'Order', sortable: true },
    {
      key: 'm.is_active', label: 'Status', sortable: true, type: 'badge',
      badgeMap: {
        'Active': { label: 'Active', class: 'bg-green-500/10 text-green-700' },
        'Inactive': { label: 'Inactive', class: 'bg-red-500/10 text-red-700' },
      },
    },
  ];

  displayKeyMap: Record<string, string> = {
    'm.name': 'name', 'm.code': 'code', 'm.route_path': 'route_path',
    'm.display_order': 'display_order', 'm.is_active': 'is_active',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['m.is_active'] = row.is_active ? 'Active' : 'Inactive';
    mapped['m.route_path'] = row.route_path || '-';
    return mapped;
  };
}
