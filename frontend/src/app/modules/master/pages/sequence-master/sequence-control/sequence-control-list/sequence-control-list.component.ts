import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { TableComponent } from '../../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../../shared/components/table/services/table-filter.service';
import { PermissionService } from '../../../../../../core/services/permission.service';
import { API } from '../../../../../../core/api/endpoints';
import { STATUS_BADGES, statusLabel } from '../../../../../../core/constants/enums';

@Component({
  selector: 'app-sequence-control-list',
  templateUrl: './sequence-control-list.component.html',
  standalone: true,
  imports: [TableComponent],
})
export class SequenceControlListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  @Output() onEditRecord = new EventEmitter<any>();
  @Output() onViewRecord = new EventEmitter<any>();

  readonly moduleCode = 'SEQUENCE_CONTROLS';
  readonly apiUrl = API.sequenceControls.base;
  readonly deleteUrl = API.sequenceControls.deleteMultiple;

  readonly columns: ColumnConfig[] = [
    { key: 'sqc.name',        label: 'Sequence',         sortable: true, searchable: true },
    { key: 'l.name',          label: 'Location',         sortable: true, searchable: true },
    { key: '_preview',        label: 'Next Code Preview', sortable: false },
    { key: 'sc.last_no',      label: 'Last No',          sortable: true },
    { key: 'sc.max_no',       label: 'Max No',           sortable: true },
    { key: 'sc.digit_length', label: 'Digits',           sortable: false },
    { key: 'sc.is_active',    label: 'Status',           sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
  ];

  readonly displayKeyMap: Record<string, string> = {
    'sqc.name':        'sequence_code_name',
    'l.name':          'location_name',
    '_preview':        '_preview',
    'sc.last_no':      'last_no',
    'sc.max_no':       'max_no',
    'sc.digit_length': 'digit_length',
    'sc.is_active':    'is_active',
  };

  readonly rowTransform = (row: any, mapped: any) => {
    const prefix = row.prefix || '';
    const suffix = row.suffix || '';
    const nextNo = Number(row.last_no) + 1;
    const padded = String(nextNo).padStart(Number(row.digit_length), '0');
    mapped['sqc.name']        = row.sequence_code?.name || '-';
    mapped['l.name']          = row.location?.name || '-';
    mapped['_preview']        = `${prefix}${padded}${suffix}`;
    mapped['sc.last_no']      = row.last_no;
    mapped['sc.max_no']       = row.max_no;
    mapped['sc.digit_length'] = row.digit_length;
    mapped['sc.is_active']    = statusLabel(row.is_active);
    return mapped;
  };

  constructor(public ps: PermissionService) {}

  reload(): void {
    this.table?.reloadCurrentPage();
  }
}
