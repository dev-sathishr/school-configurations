import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { API } from '../../../../../../core/api/endpoints';
import { STATUS_BADGES, statusLabel } from '../../../../../../core/constants/enums';
import { PermissionService } from '../../../../../../core/services/permission.service';
import { TableComponent } from '../../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../../shared/components/table/services/table-filter.service';

@Component({
  selector: 'app-employee-category-list',
  templateUrl: './employee-category-list.component.html',
  standalone: true,
  imports: [TableComponent],
})
export class EmployeeCategoryListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  @Output() onEditRecord = new EventEmitter<any>();
  @Output() onViewRecord = new EventEmitter<any>();

  readonly moduleCode = 'EMPLOYEE_CATEGORIES';
  readonly apiUrl = API.employeeCategories.base;
  readonly deleteUrl = API.employeeCategories.deleteMultiple;

  readonly columns: ColumnConfig[] = [
    { key: 'name', label: 'Name', sortable: true, searchable: true },
    { key: 'code', label: 'Code', sortable: true, searchable: true },
    { key: 'description', label: 'Description', searchable: true },
    { key: 'is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
  ];

  readonly displayKeyMap: Record<string, string> = {
    name: 'name',
    code: 'code',
    description: 'description',
    is_active: 'is_active',
  };

  readonly rowTransform = (row: any, mapped: any) => {
    mapped.description = row.description || '-';
    mapped.is_active = statusLabel(row.is_active);
    return mapped;
  };

  constructor(public ps: PermissionService) {}

  reload(): void {
    this.table?.reloadCurrentPage();
  }
}
