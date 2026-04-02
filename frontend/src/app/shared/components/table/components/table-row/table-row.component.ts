import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TableFilterService, ColumnConfig } from '../../services/table-filter.service';

@Component({
  selector: '[app-table-row]',
  imports: [FormsModule, AngularSvgIconModule],
  templateUrl: './table-row.component.html',
  styleUrl: './table-row.component.css',
})
export class TableRowComponent {
  @Input() user: any = {};
  @Input() columns: ColumnConfig[] = [];

  constructor(public filterService: TableFilterService) {}

  isVisible(col: ColumnConfig): boolean {
    return this.filterService.isColumnVisible(col.key);
  }

  getBadgeLabel(col: ColumnConfig): string {
    const val = String(this.user[col.key] ?? '');
    return col.badgeMap?.[val]?.label ?? val;
  }

  getBadgeClass(col: ColumnConfig): string {
    const val = String(this.user[col.key] ?? '');
    return col.badgeMap?.[val]?.class ?? 'bg-muted text-muted-foreground';
  }
}
