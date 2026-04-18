import { Component, ViewChild } from '@angular/core';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { PermissionService } from '../../../../../core/services/permission.service';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-menu-list',
  templateUrl: './menu-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class MenuListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  apiUrl = '/menus';
  deleteUrl = '/menus/delete-multiple';

  columns: ColumnConfig[] = [
    { key: 'm.name', label: 'Name', sortable: true, searchable: true },
    { key: 'm.code', label: 'Code', sortable: true, searchable: true },
    { key: 'm.route_path', label: 'Route Path', sortable: true },
    { key: 'parent_name', label: 'Parent Menu' },
    { key: 'm.display_order', label: 'Order', sortable: true },
    { key: 'module_count', label: 'Modules', sortable: true },
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
    'parent_name': 'parent_name', 'm.display_order': 'display_order',
    'm.is_active': 'is_active',
    'module_count': 'module_count',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['m.is_active'] = row.is_active ? 'Active' : 'Inactive';
    mapped['m.route_path'] = row.route_path || '-';
    mapped['parent_name'] = row.parent_name || '-';
    mapped['module_count'] = row.module_count ?? 0;
    return mapped;
  };

  constructor(private cs: CommonService, public ps: PermissionService) {}

  addNew() { this.cs.navigate({ url: '/settings/menu/new' }); }
  editSelected(item: any) { this.cs.navigate({ url: `/settings/menu/${item.id}/edit` }); }
  viewSelected(item: any) { this.cs.navigate({ url: `/settings/menu/${item.id}/view` }); }
}
