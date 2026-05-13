import { Component } from '@angular/core';
import { TableComponent } from '../../../../shared/components/table/table.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { BaseListComponent } from '../../../../shared/components/base-list/base-list.component';
import { API } from '../../../../core/api/endpoints';
import { STATUS_BADGES, TABLE_STATUS_BADGES, statusLabel } from '../../../../core/constants/enums';
import { ColumnConfig } from '../../../../shared/components/table/services/table-filter.service';

@Component({
  selector: 'app-doctype-list',
  templateUrl: './doctype-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class DoctypeListComponent extends BaseListComponent {
  apiUrl   = API.engineMeta.base;
  routeBase = '/engine/meta';

  columns: ColumnConfig[] = [
    { key: 'label',             label: 'Name',           sortable: true, searchable: true },
    { key: 'slug',              label: 'Slug',           sortable: true, searchable: true },
    { key: 'plural_label',      label: 'Plural Name' },
    { key: 'is_location_scoped', label: 'Location Scoped', type: 'badge', badgeMap: { 'Yes': { label: 'Yes', class: 'bg-blue-500/10 text-blue-700' }, 'No': { label: 'No', class: 'bg-muted text-muted-foreground' } } },
    { key: 'table_status',      label: 'Table Status',   type: 'badge', badgeMap: TABLE_STATUS_BADGES },
    { key: 'is_active',         label: 'Status',         type: 'badge', badgeMap: STATUS_BADGES },
  ];

  displayKeyMap: Record<string, string> = {
    label: 'label',
    slug: 'slug',
    plural_label: 'plural_label',
    is_location_scoped: 'is_location_scoped',
    table_status: 'table_status',
    is_active: 'is_active',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['is_active'] = statusLabel(row.is_active);
    mapped['is_location_scoped'] = row.is_location_scoped ? 'Yes' : 'No';
    mapped['table_status'] = row.table_status ?? 'pending';
    return mapped;
  };

  override editSelected(row: any): void {
    this.cs.navigate({ url: `${this.routeBase}/${row.slug}/edit` });
  }

  override viewSelected(row: any): void {
    this.cs.navigate({ url: `${this.routeBase}/${row.slug}/view` });
  }
}
