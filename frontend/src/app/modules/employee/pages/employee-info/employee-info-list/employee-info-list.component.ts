import { Component, inject } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';
import { LocationContextService } from '../../../../../core/services/location-context.service';
import { API } from '../../../../../core/api/endpoints';
import { STATUS_BADGES, statusLabel } from '../../../../../core/constants/enums';

@Component({
  selector: 'app-employee-info-list',
  templateUrl: './employee-info-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class EmployeeInfoListComponent extends BaseListComponent {
  readonly locationCtx = inject(LocationContextService);
  apiUrl = API.employees.base;
  override deleteUrl = API.employees.deleteMultiple;
  routeBase = '/employee/employee-info';

  columns: ColumnConfig[] = [
    { key: 'e.employee_name', label: 'Name',            sortable: true,  searchable: true,  type: 'avatar', avatarKey: 'photo_file_id' },
    { key: 'e.employee_code', label: 'Code',            sortable: true,  searchable: true },
    { key: 'designation',     label: 'Designation',     sortable: true,  searchable: false },
    { key: 'location',        label: 'Location',        sortable: true,  searchable: false },
    { key: 'primary_contact', label: 'Primary Contact', sortable: false, searchable: false },
    { key: 'e.is_active',     label: 'Status',          sortable: true,  type: 'badge', badgeMap: STATUS_BADGES },
  ];

  displayKeyMap: Record<string, string> = {
    'e.employee_name': 'employee_name',
    'e.employee_code': 'employee_code',
    'designation':     'designation',
    'location':        'location',
    'primary_contact': 'primary_contact',
    'e.is_active':     'is_active',
    'photo_file_id':   'photo_file_id',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['designation']     = row.designation?.name || '-';
    mapped['location']        = row.location?.name || '-';
    mapped['primary_contact'] = row.primary_contact_no
      ? `${row.primary_contact_code || '+91'} ${row.primary_contact_no}`
      : '-';
    mapped['e.is_active']     = statusLabel(row.is_active);
    return mapped;
  };
}
