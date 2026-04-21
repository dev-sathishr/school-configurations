import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { API } from '../../../../../core/api/endpoints';
import { STATUS_BADGES, statusLabel } from '../../../../../core/constants/enums';
import { PermissionService } from '../../../../../core/services/permission.service';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';

@Component({
  selector: 'app-designation-list',
  templateUrl: './designation-list.component.html',
  standalone: true,
  imports: [TableComponent],
})
export class DesignationListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  @Output() onEditRecord = new EventEmitter<any>();
  @Output() onViewRecord = new EventEmitter<any>();

  readonly moduleCode = 'DESIGNATIONS';
  readonly apiUrl = API.designations.base;
  readonly deleteUrl = API.designations.deleteMultiple;

  readonly columns: ColumnConfig[] = [
    { key: 'name', label: 'Name', sortable: true, searchable: true },
    { key: 'employee_group_name', label: 'Employee Group', sortable: true, searchable: true },
    { key: 'code', label: 'Code', sortable: true, searchable: true },
    { key: 'description', label: 'Description', searchable: true },
    { key: 'is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
  ];

  readonly displayKeyMap: Record<string, string> = {
    name: 'name',
    employee_group_name: 'employee_group_name',
    code: 'code',
    description: 'description',
    is_active: 'is_active',
  };

  readonly rowTransform = (row: any, mapped: any) => {
    mapped.employee_group_name = row.employee_group_name || '-';
    mapped.description = row.description || '-';
    mapped.is_active = statusLabel(row.is_active);
    return mapped;
  };

  constructor(public ps: PermissionService) {}

  reload(): void {
    this.table?.reloadCurrentPage();
  }
}
