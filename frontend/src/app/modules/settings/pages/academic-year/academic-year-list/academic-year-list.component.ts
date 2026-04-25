import { Component, inject } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';
import { LocationContextService } from '../../../../../core/services/location-context.service';
import { API } from '../../../../../core/api/endpoints';
import { STATUS_BADGES, DEFAULT_FLAG_BADGES, statusLabel, defaultFlagLabel } from '../../../../../core/constants/enums';

@Component({
  selector: 'app-academic-year-list',
  templateUrl: './academic-year-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class AcademicYearListComponent extends BaseListComponent {
  readonly locationCtx = inject(LocationContextService);

  apiUrl = API.academicYears.base;
  override deleteUrl = API.academicYears.deleteMultiple;
  routeBase = '/settings/academic-year';

  columns: ColumnConfig[] = [
    { key: 'ay.academic_year', label: 'Academic Year', sortable: true, searchable: true },
    { key: 'loc.name', label: 'Location', sortable: true, searchable: true },
    { key: 'period', label: 'Period' },
    { key: 'ay.is_default', label: 'Default', sortable: true, type: 'badge', badgeMap: DEFAULT_FLAG_BADGES },
    { key: 'ay.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
  ];

  displayKeyMap: Record<string, string> = {
    'ay.academic_year': 'academic_year',
    'loc.name': 'location_name',
    'ay.is_default': 'is_default',
    'ay.is_active': 'is_active',
  };

  rowTransform = (row: any, mapped: any) => {
    const locationName = row.location?.name || '';
    const locationCode = row.location?.code || '';
    mapped['loc.name'] = locationName ? (locationCode ? `${locationName} (${locationCode})` : locationName) : '-';
    mapped['period'] = this.formatPeriod(row.start_date, row.end_date);
    mapped['ay.is_default'] = defaultFlagLabel(row.is_default);
    mapped['ay.is_active'] = statusLabel(row.is_active);
    return mapped;
  };

  private formatPeriod(start: string, end: string): string {
    if (!start || !end) return '-';
    const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${fmt(start)} → ${fmt(end)}`;
  }
}
