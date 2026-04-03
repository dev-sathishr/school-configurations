import { Component, ViewChild } from '@angular/core';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';

@Component({
  selector: 'app-location-list',
  templateUrl: './location-list.component.html',
  imports: [TableComponent, ButtonComponent],
})
export class LocationListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  apiUrl = '/locations';
  deleteUrl = '/locations/delete-multiple';

  columns: ColumnConfig[] = [
    { key: 'organization_name', label: 'Organization', sortable: true, searchable: true },
    { key: 'l.name', label: 'Name', sortable: true, searchable: true },
    { key: 'l.code', label: 'Code', sortable: true, searchable: true },
    { key: 'l.type', label: 'Type', sortable: true, type: 'badge', badgeMap: {
      'main_branch': { label: 'Main Branch', class: 'bg-blue-500/10 text-blue-700' },
      'branch': { label: 'Branch', class: 'bg-green-500/10 text-green-700' },
      'campus': { label: 'Campus', class: 'bg-purple-500/10 text-purple-700' },
      'hostel': { label: 'Hostel', class: 'bg-orange-500/10 text-orange-700' },
      'other': { label: 'Other', class: 'bg-muted text-muted-foreground' },
    }},
    { key: 'l.city', label: 'City', sortable: true, searchable: true },
    { key: 'l.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: {
      'Active': { label: 'Active', class: 'bg-green-500/10 text-green-700' },
      'Inactive': { label: 'Inactive', class: 'bg-red-500/10 text-red-700' },
    }},
  ];

  displayKeyMap: Record<string, string> = {
    'organization_name': 'organization_name', 'l.name': 'name', 'l.code': 'code',
    'l.type': 'type', 'l.city': 'city', 'l.is_active': 'is_active',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['l.is_active'] = row.is_active ? 'Active' : 'Inactive';
    return mapped;
  };

  constructor(private cs: CommonService) {}

  addNew() { this.cs.navigate({ url: '/settings/location/new' }); }
  editSelected(row: any) { this.cs.navigate({ url: `/settings/location/${row.id}/edit` }); }
}
