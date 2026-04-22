import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { API } from '../../../../../../core/api/endpoints';
import { ACADEMIC_LEVEL_LABELS, STATUS_BADGES, statusLabel } from '../../../../../../core/constants/enums';
import { PermissionService } from '../../../../../../core/services/permission.service';
import { TableComponent } from '../../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../../shared/components/table/services/table-filter.service';

@Component({
  selector: 'app-class-general-list',
  templateUrl: './class-general-list.component.html',
  standalone: true,
  imports: [TableComponent],
})
export class ClassGeneralListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  @Output() onEditRecord = new EventEmitter<any>();
  @Output() onViewRecord = new EventEmitter<any>();

  readonly moduleCode = 'CLASSES';
  readonly apiUrl = API.classes.base;
  readonly deleteUrl = API.classes.deleteMultiple;

  readonly columns: ColumnConfig[] = [
    { key: 'c.name', label: 'Name', sortable: true, searchable: true },
    { key: 'c.code', label: 'Code', sortable: true, searchable: true },
    { key: 'c.academic_level', label: 'Level', sortable: true },
    { key: 'c.strength', label: 'Strength', sortable: true },
    { key: 'level_count', label: 'Sections', sortable: true },
    { key: 'c.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
  ];

  readonly displayKeyMap: Record<string, string> = {
    'c.name': 'name',
    'c.code': 'code',
    'c.academic_level': 'academic_level',
    'c.strength': 'strength',
    'c.is_active': 'is_active',
    level_count: 'level_count',
  };

  readonly rowTransform = (row: any, mapped: any) => {
    mapped['c.is_active'] = statusLabel(row.is_active);
    mapped['c.academic_level'] = ACADEMIC_LEVEL_LABELS[row.academic_level as keyof typeof ACADEMIC_LEVEL_LABELS] || row.academic_level;
    mapped['c.code'] = row.code || '-';
    mapped['c.strength'] = row.strength || 0;
    mapped.level_count = row.level_count ?? 0;
    return mapped;
  };

  constructor(public ps: PermissionService) {}

  reload(): void {
    this.table?.reloadCurrentPage();
  }
}
