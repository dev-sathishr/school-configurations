import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TableFilterService, ColumnConfig } from '../../services/table-filter.service';
import { environment } from 'src/environments/environment';

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

  get orderedColumns(): ColumnConfig[] {
    return this.filterService.getOrderedColumns(this.columns);
  }

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

  hasAvatar(col: ColumnConfig): boolean {
    const val = this.user[col.avatarKey || ''];
    return !!val && val !== '-' && !this.avatarErrors.has(val);
  }

  getAvatarUrl(fileId: string): string {
    const token = localStorage.getItem('access_token');
    return `${environment.apiUrl}/files/${fileId}?token=${token}`;
  }

  avatarErrors: Set<string> = new Set();

  onAvatarError(fileId: string): void {
    this.avatarErrors.add(fileId);
  }

  getInitial(name: string): string {
    return (name || '?').charAt(0).toUpperCase();
  }
}
