import { Component, ViewChild } from '@angular/core';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { PermissionService } from '../../../../../core/services/permission.service';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-module-list',
  templateUrl: './module-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class ModuleListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  apiUrl = '/modules';
  deleteUrl = '/modules/delete-multiple';

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

  constructor(private cs: CommonService, public ps: PermissionService) {}

  addNew() { this.cs.navigate({ url: '/settings/module/new' }); }
  editSelected(item: any) { this.cs.navigate({ url: `/settings/module/${item.id}/edit` }); }
  viewSelected(item: any) { this.cs.navigate({ url: `/settings/module/${item.id}/view` }); }
}
