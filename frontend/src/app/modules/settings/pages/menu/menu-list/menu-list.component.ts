import { Component } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';
import { API } from '../../../../../core/api/endpoints';
import { STATUS_BADGES, statusLabel } from '../../../../../core/constants/enums';

@Component({
  selector: 'app-menu-list',
  templateUrl: './menu-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class MenuListComponent extends BaseListComponent {
  apiUrl = API.menus.base;
  override deleteUrl = API.menus.deleteMultiple;
  routeBase = '/settings/menu';

  columns: ColumnConfig[] = [
    { key: 'm.name', label: 'Name', sortable: true, searchable: true },
    { key: 'm.display_name', label: 'Display Name', sortable: true, searchable: true },
    { key: 'm.route_path', label: 'Route Path', sortable: true },
    { key: 'parent_name', label: 'Parent Menu' },
    { key: 'm.display_order', label: 'Order', sortable: true },
    { key: 'module_count', label: 'Modules', sortable: true },
    { key: 'm.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
  ];

  displayKeyMap: Record<string, string> = {
    'm.name': 'name', 'm.display_name': 'display_name', 'm.route_path': 'route_path',
    'parent_name': 'parent_name', 'm.display_order': 'display_order',
    'm.is_active': 'is_active',
    'module_count': 'module_count',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['m.is_active'] = statusLabel(row.is_active);
    mapped['m.route_path'] = row.route_path || '-';
    mapped['parent_name'] = row.parent?.name || '-';
    mapped['module_count'] = row.module_count ?? 0;
    return mapped;
  };
}
