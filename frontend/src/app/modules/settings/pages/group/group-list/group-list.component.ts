import { Component } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';

@Component({
  selector: 'app-group-list',
  templateUrl: './group-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class GroupListComponent extends BaseListComponent {
  apiUrl = '/groups';
  override deleteUrl = '/groups/delete-multiple';
  routeBase = '/settings/group';

  columns: ColumnConfig[] = [
    { key: 'g.name', label: 'Name', sortable: true, searchable: true },
    { key: 'g.code', label: 'Code', sortable: true, searchable: true },
    { key: 'g.description', label: 'Description', searchable: true },
    { key: 'menu_count', label: 'Menus', sortable: true },
    {
      key: 'g.is_active', label: 'Status', sortable: true, type: 'badge',
      badgeMap: {
        'Active': { label: 'Active', class: 'bg-green-500/10 text-green-700' },
        'Inactive': { label: 'Inactive', class: 'bg-red-500/10 text-red-700' },
      },
    },
  ];

  displayKeyMap: Record<string, string> = {
    'g.name': 'name', 'g.code': 'code', 'g.description': 'description',
    'g.is_active': 'is_active',
    'menu_count': 'menu_count',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['g.is_active'] = row.is_active ? 'Active' : 'Inactive';
    mapped['g.description'] = row.description || '-';
    mapped['menu_count'] = row.menu_count ?? 0;
    return mapped;
  };
}
