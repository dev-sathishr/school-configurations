import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { PermissionService } from '../../../../../core/services/permission.service';
import { API } from '../../../../../core/api/endpoints';
import { STATUS_BADGES, statusLabel } from '../../../../../core/constants/enums';

@Component({
  selector: 'app-fee-category-list',
  templateUrl: './fee-category-list.component.html',
  standalone: true,
  imports: [TableComponent],
})
export class FeeCategoryListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  @Output() onEditRecord = new EventEmitter<any>();
  @Output() onViewRecord = new EventEmitter<any>();

  readonly moduleCode = 'FEE_CATEGORIES';
  readonly apiUrl = API.feeCategories.base;
  readonly deleteUrl = API.feeCategories.deleteMultiple;

  readonly columns: ColumnConfig[] = [
    { key: 'fc.code',      label: 'Code',        sortable: true, searchable: true },
    { key: 'fc.name',      label: 'Name',        sortable: true, searchable: true },
    { key: 'fc.description', label: 'Description', sortable: false },
    { key: 'fc.is_active', label: 'Status',      sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
  ];

  readonly displayKeyMap: Record<string, string> = {
    'fc.code':        'code',
    'fc.name':        'name',
    'fc.description': 'description',
    'fc.is_active':   'is_active',
  };

  readonly rowTransform = (row: any, mapped: any) => {
    mapped['fc.is_active'] = statusLabel(row.is_active);
    return mapped;
  };

  constructor(public ps: PermissionService) {}

  reload(): void {
    this.table?.reloadCurrentPage();
  }
}
