import { Component } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';
import { API } from '../../../../../core/api/endpoints';
import { LOCATION_TYPE_BADGES, STATUS_BADGES, statusLabel } from '../../../../../core/constants/enums';

@Component({
  selector: 'app-location-list',
  templateUrl: './location-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class LocationListComponent extends BaseListComponent {
  apiUrl = API.locations.base;
  override deleteUrl = API.locations.deleteMultiple;
  routeBase = '/settings/location';

  columns: ColumnConfig[] = [
    { key: 'organization_name', label: 'Organization', sortable: true, searchable: true },
    { key: 'l.name', label: 'Name', sortable: true, searchable: true },
    { key: 'l.code', label: 'Code', sortable: true, searchable: true },
    { key: 'l.type', label: 'Type', sortable: true, type: 'badge', badgeMap: LOCATION_TYPE_BADGES },
    { key: 'primary_contact_no', label: 'Primary Mobile', sortable: true, searchable: true },
    { key: 'l.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
  ];

  displayKeyMap: Record<string, string> = {
    'organization_name': 'organization_name', 'l.name': 'name', 'l.code': 'code',
    'l.type': 'type', 'primary_contact_no': 'primary_contact_no', 'l.is_active': 'is_active',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['organization_name'] = row.organization?.name || '-';
    mapped['l.is_active'] = statusLabel(row.is_active);
    mapped['primary_contact_no'] = row.primary_contact_no ? `${row.primary_contact_code || '+91'} ${row.primary_contact_no}` : '-';
    return mapped;
  };
}
