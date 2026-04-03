import { Component, effect, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { TableFilterService, ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  imports: [TableComponent, ButtonComponent],
})
export class UserListComponent implements OnInit, OnDestroy {
  users = signal<any[]>([]);
  pagination = signal<any>({ page: 1, size: 10, total_count: 0, total_pages: 0 });
  loading = false;

  columns: ColumnConfig[] = [
    { key: 'u.full_name', label: 'Full Name', sortable: true, searchable: true },
    { key: 'u.username', label: 'Username', sortable: true, searchable: true },
    { key: 'u.email', label: 'Email', sortable: true, searchable: true },
    { key: 'u.phone', label: 'Phone', sortable: true, searchable: true },
    {
      key: 'u.role', label: 'Role', sortable: true, searchable: true, type: 'badge',
      badgeMap: {
        'super admin': { label: 'super admin', class: 'bg-red-500/10 text-red-700' },
        'admin': { label: 'admin', class: 'bg-purple-500/10 text-purple-700' },
        'principal': { label: 'principal', class: 'bg-blue-500/10 text-blue-700' },
        'teacher': { label: 'teacher', class: 'bg-green-500/10 text-green-700' },
        'clerk': { label: 'clerk', class: 'bg-yellow-500/10 text-yellow-800' },
        'student': { label: 'student', class: 'bg-cyan-500/10 text-cyan-700' },
        'parent': { label: 'parent', class: 'bg-orange-500/10 text-orange-700' },
      },
    },
    {
      key: 'u.is_active', label: 'Status', sortable: true, type: 'badge',
      badgeMap: {
        'Active': { label: 'Active', class: 'bg-green-500/10 text-green-700' },
        'Inactive': { label: 'Inactive', class: 'bg-red-500/10 text-red-700' },
      },
    },
    { key: 'u.last_login', label: 'Last Login', sortable: true },
    { key: 'created_by_name', label: 'Created By' },
  ];

  displayKeyMap: Record<string, string> = {
    'u.full_name': 'full_name', 'u.username': 'username', 'u.email': 'email',
    'u.phone': 'phone', 'u.role': 'role', 'u.is_active': 'is_active',
    'u.last_login': 'last_login', 'created_by_name': 'created_by_name',
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
      for (const [col, val] of Object.entries(params.columnFilters)) {
        if (val) q[`filter[${col}]`] = val;
      }
    }
    this.cs.getService({ url: '/users', params: q }).subscribe({
      next: (res: any) => {
        this.users.set(res.data.map((u: any) => {
          const mapped: any = { ...u, selected: false };
          for (const [colKey, dataKey] of Object.entries(this.displayKeyMap)) {
            mapped[colKey] = u[dataKey] ?? '-';
          }
          mapped['u.is_active'] = u.is_active ? 'Active' : 'Inactive';
          mapped['u.role'] = (u.role || '').replace(/_/g, ' ');
          mapped['u.last_login'] = u.last_login ? new Date(u.last_login).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          }) : '-';
          return mapped;
        }));
        this.pagination.set(res.pagination);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  addNew() { this.cs.navigate({ url: '/settings/user/new' }); }
  editSelected(user: any) { this.cs.navigate({ url: `/settings/user/${user.id}/edit` }); }

  deleteMultiple(users: any[]) {
    if (!confirm(`Delete ${users.length} user(s)?`)) return;
    this.cs.postService({ url: '/users/delete-multiple', payload: { ids: users.map((u) => u.id) } }).subscribe({
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
