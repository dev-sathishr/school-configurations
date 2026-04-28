import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { TableComponent } from '../../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../../shared/components/table/services/table-filter.service';
import { PermissionService } from '../../../../../../core/services/permission.service';
import { API } from '../../../../../../core/api/endpoints';
import { STATUS_BADGES, statusLabel } from '../../../../../../core/constants/enums';

@Component({
  selector: 'app-sequence-code-list',
  templateUrl: './sequence-code-list.component.html',
  standalone: true,
  imports: [TableComponent],
})
export class SequenceCodeListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  @Output() onEditRecord = new EventEmitter<any>();
  @Output() onViewRecord = new EventEmitter<any>();

  readonly moduleCode = 'SEQUENCE_CODES';
  readonly apiUrl = API.sequenceCodes.base;
  readonly deleteUrl = API.sequenceCodes.deleteMultiple;

  readonly columns: ColumnConfig[] = [
    { key: 'sc.code', label: 'Code', sortable: true, searchable: true },
    { key: 'sc.name', label: 'Name', sortable: true, searchable: true },
    { key: 'sc.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
  ];

  readonly displayKeyMap: Record<string, string> = {
    'sc.code': 'code',
    'sc.name': 'name',
    'sc.is_active': 'is_active',
  };

  readonly rowTransform = (row: any, mapped: any) => {
    mapped['sc.is_active'] = statusLabel(row.is_active);
    return mapped;
  };

  constructor(public ps: PermissionService) {}

  reload(): void {
    this.table?.reloadCurrentPage();
  }
}
