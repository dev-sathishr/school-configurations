import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { PermissionService } from '../../../../../core/services/permission.service';
import { API } from '../../../../../core/api/endpoints';
import { STATUS_BADGES, statusLabel, DOCUMENT_TYPE_CATEGORY_BADGES } from '../../../../../core/constants/enums';

@Component({
  selector: 'app-document-type-list',
  templateUrl: './document-type-list.component.html',
  standalone: true,
  imports: [TableComponent],
})
export class DocumentTypeListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  @Output() onEditRecord = new EventEmitter<any>();
  @Output() onViewRecord = new EventEmitter<any>();

  readonly moduleCode = 'DOCUMENT_TYPES';
  readonly apiUrl = API.documentTypes.base;
  readonly deleteUrl = API.documentTypes.deleteMultiple;

  readonly columns: ColumnConfig[] = [
    { key: 'dt.code',     label: 'Code',     sortable: true, searchable: true },
    { key: 'dt.name',     label: 'Name',     sortable: true, searchable: true },
    { key: 'dt.category', label: 'Category', sortable: true, type: 'badge', badgeMap: DOCUMENT_TYPE_CATEGORY_BADGES },
    { key: 'dt.is_active', label: 'Status',  sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
  ];

  readonly displayKeyMap: Record<string, string> = {
    'dt.code':      'code',
    'dt.name':      'name',
    'dt.category':  'category',
    'dt.is_active': 'is_active',
  };

  readonly rowTransform = (row: any, mapped: any) => {
    mapped['dt.is_active'] = statusLabel(row.is_active);
    mapped['dt.category']  = row.category;
    return mapped;
  };

  constructor(public ps: PermissionService) {}

  reload(): void {
    this.table?.reloadCurrentPage();
  }
}
