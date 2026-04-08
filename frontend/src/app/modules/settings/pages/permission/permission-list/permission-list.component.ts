import { Component, ViewChild } from '@angular/core';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-permission-list',
  templateUrl: './permission-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent],
})
export class PermissionListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  apiUrl = '/permissions';
  deleteUrl = '/permissions/delete-multiple';

  columns: ColumnConfig[] = [
    { key: 'g.name', label: 'Group', sortable: true, searchable: true },
    { key: 'mod.name', label: 'Module', sortable: true, searchable: true },
    {
      key: 'p.can_view', label: 'View', sortable: true, type: 'badge',
      badgeMap: {
        'Yes': { label: 'Yes', class: 'bg-green-500/10 text-green-700' },
        'No': { label: 'No', class: 'bg-red-500/10 text-red-700' },
      },
    },
    {
      key: 'p.can_create', label: 'Create', sortable: true, type: 'badge',
      badgeMap: {
        'Yes': { label: 'Yes', class: 'bg-green-500/10 text-green-700' },
        'No': { label: 'No', class: 'bg-red-500/10 text-red-700' },
      },
    },
    {
      key: 'p.can_edit', label: 'Edit', sortable: true, type: 'badge',
      badgeMap: {
        'Yes': { label: 'Yes', class: 'bg-green-500/10 text-green-700' },
        'No': { label: 'No', class: 'bg-red-500/10 text-red-700' },
      },
    },
    {
      key: 'p.can_delete', label: 'Delete', sortable: true, type: 'badge',
      badgeMap: {
        'Yes': { label: 'Yes', class: 'bg-green-500/10 text-green-700' },
        'No': { label: 'No', class: 'bg-red-500/10 text-red-700' },
      },
    },
    { key: 'created_by_name', label: 'Created By' },
  ];

  displayKeyMap: Record<string, string> = {
    'g.name': 'group_name', 'mod.name': 'module_name',
    'p.can_view': 'can_view', 'p.can_create': 'can_create',
    'p.can_edit': 'can_edit', 'p.can_delete': 'can_delete',
    'created_by_name': 'created_by_name',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['p.can_view'] = row.can_view ? 'Yes' : 'No';
    mapped['p.can_create'] = row.can_create ? 'Yes' : 'No';
    mapped['p.can_edit'] = row.can_edit ? 'Yes' : 'No';
    mapped['p.can_delete'] = row.can_delete ? 'Yes' : 'No';
    return mapped;
  };

  constructor(private cs: CommonService) {}

  addNew() { this.cs.navigate({ url: '/settings/permission/new' }); }
  editSelected(item: any) { this.cs.navigate({ url: `/settings/permission/${item.id}/edit` }); }
}
