import { Component, computed, EventEmitter, Input, input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TableActionComponent } from './components/table-action/table-action.component';
import { TableFooterComponent } from './components/table-footer/table-footer.component';
import { TableHeaderComponent } from './components/table-header/table-header.component';
import { TableRowComponent } from './components/table-row/table-row.component';
import { ColumnConfig, TableFilterService } from './services/table-filter.service';

@Component({
  standalone: true,
  selector: 'app-table',
  templateUrl: './table.component.html',
  imports: [
    FormsModule, AngularSvgIconModule,
    TableActionComponent, TableFooterComponent, TableHeaderComponent, TableRowComponent,
  ],
})
export class TableComponent {
  @Input() columns: ColumnConfig[] = [];
  data = input<any[]>([]);
  totalCount = input(0);
  filteredCount = input(0);
  loading = input(false);
  currentPage = input(1);
  pageSize = input(10);

  @Output() onEdit = new EventEmitter<any>();
  @Output() onDelete = new EventEmitter<any>();
  @Output() onDeleteMulti = new EventEmitter<any[]>();

  constructor(public filterService: TableFilterService) {}

  get visibleColumnCount(): number {
    return this.columns.filter((c) => this.filterService.isColumnVisible(c.key)).length + 1;
  }

  get hasVisibleColumns(): boolean {
    return this.columns.some((c) => this.filterService.isColumnVisible(c.key));
  }

  get selectedRows(): any[] {
    return this.data().filter((row) => row.selected);
  }

  get selectedCount(): number {
    return this.selectedRows.length;
  }

  get isSingleSelected(): boolean {
    return this.selectedCount === 1;
  }

  public toggleAll(checked: boolean) {
    this.data().forEach((row) => (row.selected = checked));
  }

  public toggleRow(row: any) {
    row.selected = !row.selected;
  }

  editSelected() {
    if (this.isSingleSelected) {
      this.onEdit.emit(this.selectedRows[0]);
    }
  }

  deleteSelected() {
    if (this.selectedCount > 0) {
      this.onDeleteMulti.emit(this.selectedRows);
    }
  }

  clearSelection() {
    this.data().forEach((row) => (row.selected = false));
  }
}
