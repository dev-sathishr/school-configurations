import { Component, effect, EventEmitter, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TableActionComponent } from './components/table-action/table-action.component';
import { TableFooterComponent } from './components/table-footer/table-footer.component';
import { TableHeaderComponent } from './components/table-header/table-header.component';
import { TableRowComponent } from './components/table-row/table-row.component';
import { ColumnConfig, TableFilterService } from './services/table-filter.service';
import { CommonService } from '../../services/common/common.service';

@Component({
  standalone: true,
  selector: 'app-table',
  templateUrl: './table.component.html',
  imports: [
    FormsModule, AngularSvgIconModule,
    TableActionComponent, TableFooterComponent, TableHeaderComponent, TableRowComponent,
  ],
})
export class TableComponent implements OnInit, OnDestroy {
  @Input() columns: ColumnConfig[] = [];
  @Input() apiUrl = '';
  @Input() deleteUrl = '';
  @Input() displayKeyMap: Record<string, string> = {};
  @Input() rowTransform: ((row: any, mapped: any) => any) | null = null;

  @Output() onEdit = new EventEmitter<any>();

  data = signal<any[]>([]);
  pagination = signal<any>({ page: 1, size: 10, total_count: 0, total_pages: 0 });
  loading = false;

  totalCount = () => this.pagination().total_count;

  constructor(private cs: CommonService, public filterService: TableFilterService) {
    effect(() => {
      const search = this.filterService.searchField();
      const page = this.filterService.pageField();
      const size = this.filterService.pageSizeField();
      const sortBy = this.filterService.sortByField();
      const sortOrder = this.filterService.sortOrderField();
      const columnFilters = this.filterService.columnFilters();
      this.loadData({ page, size, search, sortBy, sortOrder, columnFilters });
    });
  }

  ngOnInit() {
    this.filterService.reset();
    this.filterService.initColumns(this.columns);
  }

  ngOnDestroy() {
    this.filterService.reset();
  }

  loadData(params: any = {}) {
    if (!this.apiUrl) return;
    this.loading = true;
    const q: any = { page: params.page || 1, size: params.size || 10 };
    if (params.search) q.search = params.search;
    if (params.sortBy) q.sort_by = params.sortBy;
    if (params.sortOrder) q.sort_order = params.sortOrder;
    if (params.columnFilters) {
      for (const [col, val] of Object.entries(params.columnFilters)) {
        if (val) q[`filter[${col}]`] = val;
      }
    }
    this.cs.getService({ url: this.apiUrl, params: q }).subscribe({
      next: (res: any) => {
        this.data.set(res.data.map((row: any) => {
          const mapped: any = { ...row, selected: false };
          for (const [colKey, dataKey] of Object.entries(this.displayKeyMap)) {
            mapped[colKey] = row[dataKey] ?? '-';
          }
          return this.rowTransform ? this.rowTransform(row, mapped) : mapped;
        }));
        this.pagination.set(res.pagination);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

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
    if (this.selectedCount > 0 && this.deleteUrl) {
      const rows = this.selectedRows;
      if (!confirm(`Delete ${rows.length} record(s)?`)) return;
      this.cs.postService({ url: this.deleteUrl, payload: { ids: rows.map((r) => r.id) } }).subscribe({
        next: () => this.reloadCurrentPage(),
        error: (err: any) => alert(err.error?.message || 'Delete failed'),
      });
    }
  }

  reloadCurrentPage() {
    this.loadData({
      page: this.filterService.pageField(), size: this.filterService.pageSizeField(),
      search: this.filterService.searchField(), sortBy: this.filterService.sortByField(),
      sortOrder: this.filterService.sortOrderField(), columnFilters: this.filterService.columnFilters(),
    });
  }

  clearSelection() {
    this.data().forEach((row) => (row.selected = false));
  }
}
