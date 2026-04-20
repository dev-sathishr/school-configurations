import { inject, Injectable, signal } from '@angular/core';
import { UserPreferencesService } from '../../../../core/services/user-preferences.service';

export interface ColumnConfig {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  visible?: boolean;
  type?: 'text' | 'badge' | 'avatar' | 'date' | 'link';
  badgeMap?: Record<string, { label: string; class: string }>;
  avatarKey?: string;
  /** For `type: 'link'` — name of the row field holding the target URL.
   *  If the URL is empty/null the cell renders as plain text instead. */
  linkUrlKey?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TableFilterService {
  private prefs = inject(UserPreferencesService);

  // Stable key for the currently-mounted table. Used to read/write the
  // pageSize override in UserPreferencesService.
  private currentTableKey = signal<string>('');

  // Global
  searchField = signal<string>('');
  statusField = signal<string>('');
  orderField = signal<string>('');

  // Pagination
  pageField = signal<number>(1);
  pageSizeField = signal<number>(10);

  // Column sorting
  sortByField = signal<string>('');
  sortOrderField = signal<string>('');

  // Per-column filters: { 'u.username': 'admin', 'u.role': 'teacher' }
  columnFilters = signal<Record<string, string>>({});

  // Column visibility: { 'username': true, 'email': false }
  columnVisibility = signal<Record<string, boolean>>({});

  // Column order (array of keys)
  columnOrder = signal<string[]>([]);

  // Show/hide filter row
  showFilters = signal(false);

  setColumnFilter(column: string, value: string) {
    this.columnFilters.update((filters) => ({ ...filters, [column]: value }));
    this.pageField.set(1);
  }

  toggleSort(column: string) {
    const currentBy = this.sortByField();
    const currentOrder = this.sortOrderField();

    if (currentBy === column) {
      if (currentOrder === 'asc') {
        this.sortOrderField.set('desc');
      } else if (currentOrder === 'desc') {
        this.sortByField.set('');
        this.sortOrderField.set('');
      }
    } else {
      this.sortByField.set(column);
      this.sortOrderField.set('asc');
    }
    this.pageField.set(1);
  }

  toggleColumnVisibility(key: string) {
    this.columnVisibility.update((vis) => ({ ...vis, [key]: !vis[key] }));
  }

  isColumnVisible(key: string): boolean {
    const vis = this.columnVisibility();
    return vis[key] !== false; // default visible
  }

  initColumns(columns: ColumnConfig[]) {
    const vis: Record<string, boolean> = {};
    columns.forEach((col) => {
      vis[col.key] = col.visible !== false;
    });
    this.columnVisibility.set(vis);
    this.columnOrder.set(columns.map((c) => c.key));
  }

  reorderColumn(fromIndex: number, toIndex: number) {
    this.columnOrder.update((order) => {
      const updated = [...order];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }

  getOrderedColumns(columns: ColumnConfig[]): ColumnConfig[] {
    const order = this.columnOrder();
    if (!order.length) return columns;
    const map = new Map(columns.map((c) => [c.key, c]));
    return order.map((key) => map.get(key)).filter(Boolean) as ColumnConfig[];
  }

  reset() {
    this.searchField.set('');
    this.statusField.set('');
    this.orderField.set('');
    this.pageField.set(1);
    // Do NOT reset pageSizeField here — init(tableKey) is the authority and
    // resetting would fire an extra effect run with a stale default.
    this.sortByField.set('');
    this.sortOrderField.set('');
    this.columnFilters.set({});
    this.columnOrder.set([]);
    this.currentTableKey.set('');
  }

  // ─── Table pagination (prefs-backed) ───────────────────

  /**
   * Initialise this service for the table identified by `tableKey`.
   * Seeds pageSize from user preferences (per-table override ?? global default).
   */
  init(tableKey: string) {
    this.currentTableKey.set(tableKey);
    const size = this.prefs.effectivePageSize(tableKey);
    this.pageSizeField.set(size);
    this.pageField.set(1);
  }

  /**
   * User picked a new page size for the currently-active table.
   * Writes a per-table override in preferences.
   */
  setPageSize(size: number) {
    const key = this.currentTableKey();
    this.pageSizeField.set(size);
    this.pageField.set(1);
    if (key) this.prefs.setTablePageSize(key, size);
  }

  /** Remove the per-table override for the currently-active table and fall back to the global default. */
  clearTableOverride() {
    const key = this.currentTableKey();
    if (!key) return;
    this.prefs.clearTableOverride(key);
    const size = this.prefs.effectivePageSize(key);
    this.pageSizeField.set(size);
    this.pageField.set(1);
  }
}
