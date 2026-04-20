import { Component, inject } from '@angular/core';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';
import { BaseListComponent } from '../../../../../shared/components/base-list/base-list.component';
import { LocationContextService } from '../../../../../core/services/location-context.service';

const STATUS_BADGES = {
  'Active':   { label: 'Active',   class: 'bg-green-500/10 text-green-700' },
  'Inactive': { label: 'Inactive', class: 'bg-red-500/10 text-red-700' },
};

const DEFAULT_BADGES = {
  'Default': { label: '★ Default', class: 'bg-primary/10 text-primary' },
  '—':       { label: '—',         class: 'bg-muted/20 text-muted-foreground' },
};

@Component({
  selector: 'app-academic-year-list',
  templateUrl: './academic-year-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class AcademicYearListComponent extends BaseListComponent {
  readonly locationCtx = inject(LocationContextService);

  apiUrl = '/academic-years';
  override deleteUrl = '/academic-years/delete-multiple';
  routeBase = '/settings/academic-year';

  columns: ColumnConfig[] = [
    { key: 'ay.academic_year', label: 'Academic Year', sortable: true, searchable: true },
    { key: 'loc.name', label: 'Location', sortable: true, searchable: true },
    { key: 'period', label: 'Period' },
    { key: 'ay.is_default', label: 'Default', sortable: true, type: 'badge', badgeMap: DEFAULT_BADGES },
    { key: 'ay.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
  ];

  displayKeyMap: Record<string, string> = {
    'ay.academic_year': 'academic_year',
    'loc.name': 'location_name',
    'ay.is_default': 'is_default',
    'ay.is_active': 'is_active',
  };

  rowTransform = (row: any, mapped: any) => {
    mapped['loc.name'] = row.location_code ? `${row.location_name} (${row.location_code})` : (row.location_name || '-');
    mapped['period'] = this.formatPeriod(row.start_date, row.end_date);
    mapped['ay.is_default'] = row.is_default ? 'Default' : '—';
    mapped['ay.is_active'] = row.is_active ? 'Active' : 'Inactive';
    return mapped;
  };

  private formatPeriod(start: string, end: string): string {
    if (!start || !end) return '-';
    const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${fmt(start)} → ${fmt(end)}`;
  }
}
