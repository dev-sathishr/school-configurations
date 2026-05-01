import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { PermissionService } from '../../../../../core/services/permission.service';
import { API } from '../../../../../core/api/endpoints';
import { STATUS_BADGES, statusLabel } from '../../../../../core/constants/enums';

@Component({
  selector: 'app-curriculum-list',
  templateUrl: './curriculum-list.component.html',
  standalone: true,
  imports: [TableComponent],
})
export class CurriculumListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  @Output() onEditRecord = new EventEmitter<any>();
  @Output() onViewRecord = new EventEmitter<any>();

  readonly moduleCode = 'CURRICULUM';
  readonly apiUrl = API.curriculums.base;
  readonly deleteUrl = API.curriculums.deleteMultiple;

  readonly columns: ColumnConfig[] = [
    { key: 'c.name',      label: 'Name',   sortable: true, searchable: true },
    { key: 'c.notes',     label: 'Notes',  sortable: false },
    { key: 'c.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
  ];

  readonly displayKeyMap: Record<string, string> = {
    'c.name':      'name',
    'c.notes':     'notes',
    'c.is_active': 'is_active',
  };

  readonly rowTransform = (row: any, mapped: any) => {
    mapped['c.is_active'] = statusLabel(row.is_active);
    return mapped;
  };

  constructor(public ps: PermissionService) {}

  reload(): void {
    this.table?.reloadCurrentPage();
  }
}
