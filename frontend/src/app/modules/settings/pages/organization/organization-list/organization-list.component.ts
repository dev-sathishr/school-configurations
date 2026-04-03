import { Component, effect, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { TableFilterService, ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';

@Component({
  selector: 'app-organization-list',
  templateUrl: './organization-list.component.html',
  imports: [TableComponent, ButtonComponent],
})
export class OrganizationListComponent implements OnInit, OnDestroy {
  data = signal<any[]>([]);
  pagination = signal<any>({ page: 1, size: 10, total_count: 0, total_pages: 0 });
  loading = false;

  columns: ColumnConfig[] = [
    { key: 'o.name', label: 'Name', sortable: true, searchable: true },
    { key: 'o.reg_no', label: 'Reg No', sortable: true, searchable: true },
    { key: 'o.email', label: 'Email', sortable: true, searchable: true },
    { key: 'o.primary_contact_no', label: 'Contact', sortable: true },
    { key: 'o.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: {
      'Active': { label: 'Active', class: 'bg-green-500/10 text-green-700' },
      'Inactive': { label: 'Inactive', class: 'bg-red-500/10 text-red-700' },
    }},
    { key: 'created_by_name', label: 'Created By' },
  ];

  displayKeyMap: Record<string, string> = {
    'o.name': 'name', 'o.reg_no': 'reg_no', 'o.email': 'email',
    'o.primary_contact_no': 'primary_contact_no', 'o.is_active': 'is_active',
    'created_by_name': 'created_by_name',
  };

  constructor(private cs: CommonService, public filterService: TableFilterService) {
    this.filterService.reset();
    this.filterService.initColumns(this.columns);
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

  ngOnInit() {}
  ngOnDestroy() { this.filterService.reset(); }

  loadData(params: any = {}) {
    this.loading = true;
    const q: any = { page: params.page || 1, size: params.size || 10 };
    if (params.search) q.search = params.search;
    if (params.sortBy) q.sort_by = params.sortBy;
    if (params.sortOrder) q.sort_order = params.sortOrder;
    if (params.columnFilters) {
      for (const [col, val] of Object.entries(params.columnFilters)) { if (val) q[`filter[${col}]`] = val; }
    }
    this.cs.getService({ url: '/organizations', params: q }).subscribe({
      next: (res: any) => {
        this.data.set(res.data.map((r: any) => {
          const mapped: any = { ...r, selected: false };
          for (const [colKey, dataKey] of Object.entries(this.displayKeyMap)) { mapped[colKey] = r[dataKey] ?? '-'; }
          mapped['o.is_active'] = r.is_active ? 'Active' : 'Inactive';
          mapped['o.primary_contact_no'] = r.primary_contact_no ? `${r.primary_contact_code} ${r.primary_contact_no}` : '-';
          return mapped;
        }));
        this.pagination.set(res.pagination);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  addNew() { this.cs.navigate({ url: '/settings/organization/new' }); }
  editSelected(row: any) { this.cs.navigate({ url: `/settings/organization/${row.id}/edit` }); }

  deleteMultiple(rows: any[]) {
    if (!confirm(`Delete ${rows.length} organization(s)?`)) return;
    this.cs.postService({ url: '/organizations/delete-multiple', payload: { ids: rows.map((r) => r.id) } }).subscribe({
      next: () => this.reloadCurrentPage(),
      error: (err: any) => alert(err.error?.message || 'Delete failed'),
    });
  }

  reloadCurrentPage() {
    this.loadData({
      page: this.filterService.pageField(), size: this.filterService.pageSizeField(),
      search: this.filterService.searchField(), sortBy: this.filterService.sortByField(),
      sortOrder: this.filterService.sortOrderField(), columnFilters: this.filterService.columnFilters(),
    });
  }
}
