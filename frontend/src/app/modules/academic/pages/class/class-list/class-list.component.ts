import { Component } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';
import { API } from '../../../../../core/api/endpoints';
import { ACADEMIC_LEVEL_LABELS, STATUS_BADGES, statusLabel } from '../../../../../core/constants/enums';

@Component({
  selector: 'app-class-list',
  templateUrl: './class-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class ClassListComponent extends BaseListComponent {
  apiUrl = API.classes.base;
  override deleteUrl = API.classes.deleteMultiple;
  routeBase = '/academic/class';

  columns: ColumnConfig[] = [
    { key: 'c.name', label: 'Name', sortable: true, searchable: true },
    { key: 'c.code', label: 'Code', sortable: true, searchable: true },
    { key: 'c.academic_level', label: 'Level', sortable: true },
    { key: 'c.strength', label: 'Strength', sortable: true },
    { key: 'level_count', label: 'Sections', sortable: true },
    { key: 'c.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
  ];

  displayKeyMap: Record<string, string> = {
    'c.name': 'name', 'c.code': 'code', 'c.academic_level': 'academic_level',
    'c.strength': 'strength', 'c.is_active': 'is_active',
    'level_count': 'level_count',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['c.is_active'] = statusLabel(row.is_active);
    mapped['c.academic_level'] = ACADEMIC_LEVEL_LABELS[row.academic_level as keyof typeof ACADEMIC_LEVEL_LABELS] || row.academic_level;
    mapped['c.code'] = row.code || '-';
    mapped['c.strength'] = row.strength || 0;
    mapped['level_count'] = row.level_count ?? 0;
    return mapped;
  };
}
