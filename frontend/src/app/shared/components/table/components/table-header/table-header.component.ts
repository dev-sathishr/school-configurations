import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TableFilterService, ColumnConfig } from '../../services/table-filter.service';

@Component({
  selector: '[app-table-header]',
  imports: [FormsModule, AngularSvgIconModule],
  templateUrl: './table-header.component.html',
  styleUrl: './table-header.component.css',
})
export class TableHeaderComponent {
  @Input() columns: ColumnConfig[] = [];
  @Input() showActions = true;
  @Output() onCheck = new EventEmitter<boolean>();

  constructor(public filterService: TableFilterService) {}

  toggle(event: Event) {
    const value = (event.target as HTMLInputElement).checked;
    this.onCheck.emit(value);
  }

  onSort(col: ColumnConfig) {
    if (!col.sortable) return;
    this.filterService.toggleSort(col.key);
  }

  getSortIcon(col: ColumnConfig): string {
    if (!col.sortable) return '';
    const sortBy = this.filterService.sortByField();
    const sortOrder = this.filterService.sortOrderField();
    if (sortBy !== col.key) return 'assets/icons/heroicons/outline/arrows-shuffle-2.svg';
    return sortOrder === 'asc'
      ? 'assets/icons/heroicons/outline/arrow-sm-up.svg'
      : 'assets/icons/heroicons/outline/arrow-sm-right.svg';
  }

  isSorted(col: ColumnConfig): boolean {
    return this.filterService.sortByField() === col.key;
  }

  onColumnSearch(col: ColumnConfig, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.filterService.setColumnFilter(col.key, value);
  }

  isVisible(col: ColumnConfig): boolean {
    return this.filterService.isColumnVisible(col.key);
  }

  get hasSearchableColumns(): boolean {
    return this.columns.some((c) => c.searchable && this.isVisible(c));
  }
}
