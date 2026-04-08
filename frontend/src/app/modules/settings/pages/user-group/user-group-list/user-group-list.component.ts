import { Component, ViewChild } from '@angular/core';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-user-group-list',
  templateUrl: './user-group-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent],
})
export class UserGroupListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  apiUrl = '/user-groups';
  deleteUrl = '/user-groups/delete-multiple';

  columns: ColumnConfig[] = [
    { key: 'ug.name', label: 'Name', sortable: true, searchable: true },
    { key: 'ug.code', label: 'Code', sortable: true },
    { key: 'ug.description', label: 'Description' },
    { key: 'ug.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: {
      'Active': { label: 'Active', class: 'bg-green-500/10 text-green-700' },
      'Inactive': { label: 'Inactive', class: 'bg-red-500/10 text-red-700' },
    }},
    { key: 'ug.is_system', label: 'System', sortable: true, type: 'badge', badgeMap: {
      'Yes': { label: 'Yes', class: 'bg-blue-500/10 text-blue-700' },
      'No': { label: 'No', class: 'bg-gray-500/10 text-gray-700' },
    }},
  ];

  displayKeyMap: Record<string, string> = {
    'ug.name': 'name', 'ug.code': 'code', 'ug.description': 'description',
    'ug.is_active': 'is_active', 'ug.is_system': 'is_system',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['ug.is_active'] = row.is_active ? 'Active' : 'Inactive';
    mapped['ug.is_system'] = row.is_system ? 'Yes' : 'No';
    mapped['ug.description'] = row.description || '-';
    return mapped;
  };

  constructor(private cs: CommonService) {}

  addNew() { this.cs.navigate({ url: '/settings/user-group/new' }); }
  editSelected(row: any) { this.cs.navigate({ url: `/settings/user-group/${row.id}/edit` }); }
}
