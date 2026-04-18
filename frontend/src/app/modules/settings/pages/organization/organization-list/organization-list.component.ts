import { Component, ViewChild } from '@angular/core';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { PermissionService } from '../../../../../core/services/permission.service';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-organization-list',
  templateUrl: './organization-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class OrganizationListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  apiUrl = '/organizations';
  deleteUrl = '/organizations/delete-multiple';

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

  constructor(private cs: CommonService, public ps: PermissionService) {}

  addNew() { this.cs.navigate({ url: '/settings/organization/new' }); }
  editSelected(row: any) { this.cs.navigate({ url: `/settings/organization/${row.id}/edit` }); }
  viewSelected(row: any) { this.cs.navigate({ url: `/settings/organization/${row.id}/view` }); }
}
