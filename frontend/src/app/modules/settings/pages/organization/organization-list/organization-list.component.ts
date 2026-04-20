import { Component } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';

@Component({
  selector: 'app-organization-list',
  templateUrl: './organization-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class OrganizationListComponent extends BaseListComponent {
  apiUrl = '/organizations';
  override deleteUrl = '/organizations/delete-multiple';
  routeBase = '/settings/organization';

  columns: ColumnConfig[] = [
    { key: 'o.name', label: 'Name', sortable: true, searchable: true, type: 'avatar', avatarKey: 'logo_file_id' },
    { key: 'o.reg_no', label: 'Reg No', sortable: true, searchable: true },
    { key: 'o.email', label: 'Email', sortable: true, searchable: true },
    { key: 'o.primary_contact_no', label: 'Contact', sortable: true },
    { key: 'location_count', label: 'Locations', sortable: true },
    { key: 'o.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: {
      'Active': { label: 'Active', class: 'bg-green-500/10 text-green-700' },
      'Inactive': { label: 'Inactive', class: 'bg-red-500/10 text-red-700' },
    }},
  ];

  displayKeyMap: Record<string, string> = {
    'o.name': 'name', 'o.reg_no': 'reg_no', 'o.email': 'email',
    'o.primary_contact_no': 'primary_contact_no', 'o.is_active': 'is_active',
    'logo_file_id': 'logo_file_id',
    'location_count': 'location_count',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['o.is_active'] = row.is_active ? 'Active' : 'Inactive';
    mapped['o.primary_contact_no'] = row.primary_contact_no ? `${row.primary_contact_code} ${row.primary_contact_no}` : '-';
    mapped['location_count'] = row.location_count ?? 0;
    return mapped;
  };
}
