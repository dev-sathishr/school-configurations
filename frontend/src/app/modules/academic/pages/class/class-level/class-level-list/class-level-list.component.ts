import { Component, EventEmitter, Output, ViewChild, inject } from '@angular/core';
import { API } from '../../../../../../core/api/endpoints';
import { STATUS_BADGES, statusLabel } from '../../../../../../core/constants/enums';
import { LocationContextService } from '../../../../../../core/services/location-context.service';
import { PermissionService } from '../../../../../../core/services/permission.service';
import { TableComponent } from '../../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../../shared/components/table/services/table-filter.service';

@Component({
  selector: 'app-class-level-list',
  templateUrl: './class-level-list.component.html',
  standalone: true,
  imports: [TableComponent],
})
export class ClassLevelListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  readonly locationCtx = inject(LocationContextService);

  @Output() onEditRecord = new EventEmitter<any>();
  @Output() onViewRecord = new EventEmitter<any>();

  readonly moduleCode = 'CLASS_LEVELS';
  readonly apiUrl = API.classLevels.base;
  readonly deleteUrl = API.classLevels.deleteMultiple;

  readonly columns: ColumnConfig[] = [
    { key: 'cl.code', label: 'Code', sortable: true, searchable: true },
    { key: 'cl.section', label: 'Section', sortable: true },
    { key: 'cl.capacity', label: 'Capacity', sortable: true },
    { key: 'loc.name', label: 'Location', sortable: true },
    { key: 'cl.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
  ];

  readonly displayKeyMap: Record<string, string> = {
    'cl.code': 'code',
    'cl.section': 'section',
    'cl.capacity': 'capacity',
    'loc.name': 'location_name',
    'cl.is_active': 'is_active',
  };

  readonly rowTransform = (row: any, mapped: any) => {
    mapped['cl.is_active'] = statusLabel(row.is_active);
    mapped['cl.capacity'] = row.capacity || 0;
    mapped['cl.section'] = row.section || '-';
    mapped['loc.name'] = row.location_name
      ? (row.location_code ? `${row.location_name} (${row.location_code})` : row.location_name)
      : '-';
    return mapped;
  };

  constructor(public ps: PermissionService) {}

  reload(): void {
    this.table?.reloadCurrentPage();
  }
}
