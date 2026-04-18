import { Component, ViewChild } from '@angular/core';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { PermissionService } from '../../../../../core/services/permission.service';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';

const LEVEL_LABELS: Record<string, string> = {
  nursery: 'Nursery',
  primary: 'Primary',
  middle: 'Middle',
  secondary: 'Secondary',
  higher_secondary: 'Higher Secondary',
};

@Component({
  selector: 'app-class-list',
  templateUrl: './class-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class ClassListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  apiUrl = '/classes';
  deleteUrl = '/classes/delete-multiple';

  columns: ColumnConfig[] = [
    { key: 'c.name', label: 'Name', sortable: true, searchable: true },
    { key: 'c.code', label: 'Code', sortable: true, searchable: true },
    { key: 'c.academic_level', label: 'Level', sortable: true },
    { key: 'c.strength', label: 'Strength', sortable: true },
    { key: 'level_count', label: 'Sections', sortable: true },
    { key: 'c.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: {
      'Active': { label: 'Active', class: 'bg-green-500/10 text-green-700' },
      'Inactive': { label: 'Inactive', class: 'bg-red-500/10 text-red-700' },
    }},
  ];

  displayKeyMap: Record<string, string> = {
    'c.name': 'name', 'c.code': 'code', 'c.academic_level': 'academic_level',
    'c.strength': 'strength', 'c.is_active': 'is_active',
    'level_count': 'level_count',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['c.is_active'] = row.is_active ? 'Active' : 'Inactive';
    mapped['c.academic_level'] = LEVEL_LABELS[row.academic_level] || row.academic_level;
    mapped['c.code'] = row.code || '-';
    mapped['c.strength'] = row.strength || 0;
    mapped['level_count'] = row.level_count ?? 0;
    return mapped;
  };

  constructor(private cs: CommonService, public ps: PermissionService) {}

  addNew() { this.cs.navigate({ url: '/academic/class/new' }); }
  editSelected(row: any) { this.cs.navigate({ url: `/academic/class/${row.id}/edit` }); }
  viewSelected(row: any) { this.cs.navigate({ url: `/academic/class/${row.id}/view` }); }
}
