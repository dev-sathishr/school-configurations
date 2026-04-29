import { Component } from '@angular/core';
import { API } from '../../../../../core/api/endpoints';
import { PROFILE_STATUS_BADGES, GENDER_LABELS } from '../../../../../core/constants/enums';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';

@Component({
  selector: 'app-admission-management-list',
  templateUrl: './admission-management-list.component.html',
  imports: [BreadcrumbComponent, ButtonComponent, HasPermissionDirective, TableComponent],
})
export class AdmissionManagementListComponent extends BaseListComponent {
  apiUrl = API.studentProfiles.base;
  override deleteUrl = API.studentProfiles.deleteMultiple;
  routeBase = '/student/admission';

  columns: ColumnConfig[] = [
    { key: 'full_name',           label: 'Student Name',  sortable: true },
    { key: 'gender',              label: 'Gender',        sortable: false },
    { key: 'primary_contact_no',  label: 'Contact',       sortable: false },
    { key: 'status',              label: 'Status',        type: 'badge', badgeMap: PROFILE_STATUS_BADGES, sortable: true },
    { key: 'created_at',          label: 'Created',       type: 'date',  sortable: true },
  ];

  displayKeyMap: Record<string, string> = {
    profile_no:         'profile_no',
    full_name:          'full_name',
    gender:             'gender',
    primary_contact_no: 'primary_contact_no',
    status:             'status',
    created_at:         'created_at',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['gender'] = GENDER_LABELS[row.gender] ?? row.gender ?? '—';
    mapped['primary_contact_no'] = row.primary_contact_no
      ? `${row.primary_contact_code ?? ''} ${row.primary_contact_no}`.trim()
      : '—';
    return mapped;
  };
}
