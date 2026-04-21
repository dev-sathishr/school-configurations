import { Component, effect, EventEmitter, Input, input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TableActionComponent } from './components/table-action/table-action.component';
import { TableFooterComponent } from './components/table-footer/table-footer.component';
import { TableHeaderComponent } from './components/table-header/table-header.component';
import { TableRowComponent } from './components/table-row/table-row.component';
import { ImportDialogComponent } from './components/import-dialog/import-dialog.component';
import { ColumnConfig, TableFilterService } from './services/table-filter.service';
import { AUDIT_COLUMNS } from './audit-columns';
import { ExportFormat, exportRows } from './exporters';
import { CommonService } from '../../services/common/common.service';
import { LoaderComponent } from '../loader/loader.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

@Component({
  standalone: true,
  selector: 'app-table',
  templateUrl: './table.component.html',
  providers: [TableFilterService],
  imports: [
    FormsModule, AngularSvgIconModule,
    TableActionComponent, TableFooterComponent, TableHeaderComponent, TableRowComponent,
    LoaderComponent, ConfirmDialogComponent, ImportDialogComponent, EmptyStateComponent,
  ],
})
export class TableComponent implements OnInit, OnDestroy {
  @Input() columns: ColumnConfig[] = [];
  @Input() apiUrl = '';
  @Input() deleteUrl = '';
  @Input() displayKeyMap: Record<string, string> = {};
  @Input() rowTransform: ((row: any, mapped: any) => any) | null = null;
  @Input() canEdit = true;
  @Input() canDelete = true;
  @Input() canView = true;
  @Input() canImport = false;
  @Input() canExport = true;

  // Extra query params merged into every list/export request. Declared as a
  // signal input so consumers can pass a reactive value (e.g. derived from
  // the header location multiselect) and the table auto-refetches when it
  // changes. Empty/undefined values are stripped before building the query.
  readonly extraParams = input<Record<string, any>>({});

  @Output() onEdit = new EventEmitter<any>();
  @Output() onView = new EventEmitter<any>();
  @Output() onImport = new EventEmitter<void>();

  data = signal<any[]>([]);
  pagination = signal<any>({ page: 1, size: 10, total_count: 0, total_pages: 0 });
  loading = false;
  showDeleteConfirm = false;
  deleting = false;
  showImportDialog = false;

  // Gate the effect so it doesn't fire during construction with stale
  // filterService defaults. This is public because the template also uses it
  // to avoid rendering column-dependent bindings before table setup completes.
  readonly initialized = signal(false);
  private destroyed = false;

  totalCount = () => this.pagination().total_count;

  /** True when the user has narrowed the result set via search or any column
   *  filter. Used by the empty state to choose between "nothing exists" vs
   *  "nothing matches" copy. */
  get hasActiveFilters(): boolean {
    if (this.filterService.searchField()) return true;
    return Object.values(this.filterService.columnFilters()).some((v) => !!v);
  }

  /**
   * All configured columns plus the shared audit columns (created_at, created_by,
   * updated_at, updated_by). Audit columns are hidden by default except "Updated By".
   * If the parent already declared an audit column manually (e.g. a custom label
   * or pre-audit-era code), that one wins and we skip the duplicate from the set.
   */
  get effectiveColumns(): ColumnConfig[] {
    const existing = new Set(this.columns.map((c) => c.key));
    const missing = AUDIT_COLUMNS.filter((c) => !existing.has(c.key));
    return [...this.columns, ...missing];
  }

  constructor(
    private cs: CommonService,
    public filterService: TableFilterService
  ) {
    effect(() => {
      if (!this.initialized()) return;
      const search = this.filterService.searchField();
      const page = this.filterService.pageField();
      const size = this.filterService.pageSizeField();
      const sortBy = this.filterService.sortByField();
      const sortOrder = this.filterService.sortOrderField();
      const columnFilters = this.filterService.columnFilters();
      // Track extraParams() so the effect re-runs when the parent (e.g. the
      // header location multiselect) changes its value.
      const extra = this.extraParams();
      this.loadData({ page, size, search, sortBy, sortOrder, columnFilters, extra });
    });
  }

  ngOnInit() {
    this.filterService.reset();
    this.filterService.initColumns(this.effectiveColumns);
    this.filterService.init(this.apiUrl);
    // Open the gate — the effect re-runs once with the resolved pageSize.
    this.initialized.set(true);
  }

  ngOnDestroy() {
    this.destroyed = true;
    // TableFilterService is component-scoped (provider on this component),
    // so teardown is automatic. Avoid mutating template-bound state here;
    // navigation can destroy a view during the same tick and trigger NG0100.
  }

  loadData(params: any = {}) {
    if (!this.apiUrl) return;
    this.setLoading(true);
    const q: any = { page: params.page || 1, size: params.size || 10 };
    if (params.search) q.search = params.search;
    if (params.sortBy) q.sort_by = params.sortBy;
    if (params.sortOrder) q.sort_order = params.sortOrder;
    if (params.columnFilters) {
      for (const [col, val] of Object.entries(params.columnFilters)) {
        if (val) q[`filter[${col}]`] = val;
      }
    }
    const extra = params.extra || this.extraParams();
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === null || v === '') continue;
      q[k] = v;
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
        this.setLoading(false);
      },
      error: () => { this.setLoading(false); },
    });
  }

  get visibleColumnCount(): number {
    return this.effectiveColumns.filter((c) => this.filterService.isColumnVisible(c.key)).length + 1;
  }

  get orderedColumns(): ColumnConfig[] {
    return this.filterService.getOrderedColumns(this.effectiveColumns);
  }

  get hasVisibleColumns(): boolean {
    return this.effectiveColumns.some((c) => this.filterService.isColumnVisible(c.key));
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

  public invertSelection() {
    this.data().forEach((row) => (row.selected = !row.selected));
  }

  public toggleRow(row: any) {
    row.selected = !row.selected;
  }

  editSelected() {
    if (this.isSingleSelected) {
      this.onEdit.emit(this.selectedRows[0]);
    }
  }

  viewSelected() {
    if (this.isSingleSelected) {
      this.onView.emit(this.selectedRows[0]);
    }
  }

  // ─── Import ──────────────────────────────────────────

  startImport() {
    this.showImportDialog = true;
    this.onImport.emit();
  }

  closeImport() {
    this.showImportDialog = false;
  }

  onImportDone() {
    // Reload after a successful import so the user sees the new rows.
    this.reloadCurrentPage();
  }

  // ─── Export ──────────────────────────────────────────

  /**
   * Fetches all rows matching the current filter/sort state, then exports them
   * in the chosen format. "All rows" is capped at 10,000 to avoid runaway requests;
   * promote to a server-side streaming endpoint if you expect larger datasets.
   */
  exportAll(format: ExportFormat) {
    if (!this.apiUrl || this.loading) return;
    this.setLoading(true);

    const q: any = { page: 1, size: 10000 };
    const search = this.filterService.searchField();
    const sortBy = this.filterService.sortByField();
    const sortOrder = this.filterService.sortOrderField();
    const columnFilters = this.filterService.columnFilters();
    if (search) q.search = search;
    if (sortBy) q.sort_by = sortBy;
    if (sortOrder) q.sort_order = sortOrder;
    for (const [col, val] of Object.entries(columnFilters)) {
      if (val) q[`filter[${col}]`] = val;
    }
    for (const [k, v] of Object.entries(this.extraParams())) {
      if (v === undefined || v === null || v === '') continue;
      q[k] = v;
    }

    this.cs.getService({ url: this.apiUrl, params: q }).subscribe({
      next: (res: any) => {
        const rows = (res.data || []).map((row: any) => {
          const mapped: any = { ...row };
          for (const [colKey, dataKey] of Object.entries(this.displayKeyMap)) {
            mapped[colKey] = row[dataKey] ?? '';
          }
          return this.rowTransform ? this.rowTransform(row, mapped) : mapped;
        });
        const orderedCols = this.filterService.getOrderedColumns(this.effectiveColumns);
        const visibleCols = orderedCols.filter((c) => this.filterService.isColumnVisible(c.key));
        const filename = this.apiUrl.split('/').filter(Boolean).pop() || 'export';
        exportRows(rows, visibleCols, filename, format);
        this.setLoading(false);
      },
      error: () => {
        this.setLoading(false);
        this.cs.showToastr({ type: 'error', message: 'Export failed' });
      },
    });
  }

  deleteSelected() {
    if (this.selectedCount > 0 && this.deleteUrl) {
      this.showDeleteConfirm = true;
    }
  }

  confirmDelete() {
    this.deleting = true;
    const rows = this.selectedRows;
    this.cs.postService({ url: this.deleteUrl, payload: { ids: rows.map((r) => r.id) } }).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.cs.showToastr({ type: 'success', message: 'Deleted successfully', description: `${rows.length} record${rows.length > 1 ? 's' : ''} removed` });
        this.reloadCurrentPage();
      },
      error: (err: any) => {
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.cs.showToastr({ type: 'error', message: err.error?.message || 'Delete failed' });
      },
    });
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
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

  private setLoading(next: boolean): void {
    queueMicrotask(() => {
      if (this.destroyed) return;
      this.loading = next;
    });
  }
}
