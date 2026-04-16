import { Component, ViewChild } from '@angular/core';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { PermissionService } from '../../../../../core/services/permission.service';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-permission-list',
  templateUrl: './permission-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class PermissionListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  apiUrl = '/permissions';
  deleteUrl = '/permissions/delete-multiple';

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
    { key: 'created_by_name', label: 'Created By' },
  ];

  displayKeyMap: Record<string, string> = {
    'p.name': 'name', 'p.code': 'code', 'p.description': 'description',
    'p.is_active': 'is_active', 'created_by_name': 'created_by_name',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['p.is_active'] = row.is_active ? 'Active' : 'Inactive';
    mapped['p.description'] = row.description || '-';
    return mapped;
  };

  constructor(private cs: CommonService, public ps: PermissionService) {}

  addNew() { this.cs.navigate({ url: '/settings/permission/new' }); }
  editSelected(item: any) { this.cs.navigate({ url: `/settings/permission/${item.id}/edit` }); }
}
