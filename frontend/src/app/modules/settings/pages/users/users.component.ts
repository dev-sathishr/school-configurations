import { Component, effect, OnDestroy, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService, Pagination } from '../../../../core/services/user.service';
import { TableComponent } from '../../../../shared/components/table/table.component';
import { TableFilterService, ColumnConfig } from '../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  imports: [NgClass, FormsModule, ReactiveFormsModule, TableComponent, ButtonComponent],
})
export class UsersComponent implements OnInit, OnDestroy {
  users = signal<any[]>([]);
  pagination = signal<Pagination>({ page: 1, size: 10, total_count: 0, total_pages: 0 });
  loading = false;
  showModal = false;
  editMode = false;
  editUserId = '';
  form!: FormGroup;
  submitted = false;
  saving = false;
  errorMessage = '';

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

  // Map column keys to display keys for row rendering
  displayKeyMap: Record<string, string> = {
    'u.full_name': 'full_name',
    'u.username': 'username',
    'u.email': 'email',
    'u.phone': 'phone',
    'u.role': 'role',
    'u.is_active': 'is_active',
    'u.last_login': 'last_login',
    'created_by_name': 'created_by_name',
  };

  roles = [
    'super_admin', 'admin', 'principal', 'vice_principal', 'hod',
    'teacher', 'class_teacher', 'accountant', 'librarian', 'clerk',
    'lab_assistant', 'transport_manager', 'student', 'parent',
  ];

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    public filterService: TableFilterService,
  ) {
    this.filterService.reset();
    this.filterService.initColumns(this.columns);

    effect(() => {
      const search = this.filterService.searchField();
      const page = this.filterService.pageField();
      const size = this.filterService.pageSizeField();
      const sortBy = this.filterService.sortByField();
      const sortOrder = this.filterService.sortOrderField();
      const columnFilters = this.filterService.columnFilters();

      this.loadUsers({ page, size, search, sortBy, sortOrder, columnFilters });
    });
  }

  ngOnInit(): void {
    this.initForm();
  }

  ngOnDestroy(): void {
    this.filterService.reset();
  }

  initForm(): void {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', this.editMode ? [] : Validators.required],
      full_name: ['', Validators.required],
      email: [''],
      phone: [''],
      role: ['clerk', Validators.required],
      is_active: [true],
    });
  }

  get f() {
    return this.form.controls;
  }

  loadUsers(params: any = {}): void {
    this.loading = true;

    const queryParams: any = {
      page: params.page || 1,
      size: params.size || 10,
    };

    if (params.search) queryParams.search = params.search;
    if (params.sortBy) queryParams.sort_by = params.sortBy;
    if (params.sortOrder) queryParams.sort_order = params.sortOrder;

    // Column filters → filter[column]=value
    if (params.columnFilters) {
      for (const [col, val] of Object.entries(params.columnFilters)) {
        if (val) queryParams[`filter[${col}]`] = val;
      }
    }

    this.userService.getAllRaw(queryParams).subscribe({
      next: (res: any) => {
        // Map data for row display using displayKeyMap
        this.users.set(res.data.map((u: any) => {
          const mapped: any = { ...u, selected: false };
          // Rows use column keys (e.g. 'u.full_name'), map them to flat data keys
          for (const [colKey, dataKey] of Object.entries(this.displayKeyMap)) {
            mapped[colKey] = u[dataKey] ?? '-';
          }
          // Format special fields
          mapped['u.is_active'] = u.is_active ? 'Active' : 'Inactive';
          mapped['u.role'] = this.formatRole(u.role);
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

  openAddModal(): void {
    this.editMode = false;
    this.editUserId = '';
    this.submitted = false;
    this.errorMessage = '';
    this.initForm();
    this.showModal = true;
  }

  openEditModal(user: any): void {
    this.editMode = true;
    this.editUserId = user.id;
    this.submitted = false;
    this.errorMessage = '';
    this.form = this.fb.group({
      username: [user.username, Validators.required],
      password: [''],
      full_name: [user.full_name, Validators.required],
      email: [user.email || ''],
      phone: [user.phone || ''],
      role: [user.role, Validators.required],
      is_active: [user.is_active],
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.errorMessage = '';
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) return;

    this.saving = true;
    const data = { ...this.form.value };
    if (this.editMode && !data.password) delete data.password;

    const request = this.editMode
      ? this.userService.update(this.editUserId, data)
      : this.userService.create(data);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.reloadCurrentPage();
      },
      error: (err) => { this.saving = false; this.errorMessage = err.error?.message || 'Something went wrong'; },
    });
  }

  deleteMultipleUsers(users: any[]): void {
    const count = users.length;
    const msg = count === 1
      ? `Are you sure you want to delete "${users[0].full_name}"?`
      : `Are you sure you want to delete ${count} users?`;
    if (!confirm(msg)) return;

    const ids = users.map((u) => u.id);
    this.userService.deleteMultiple(ids).subscribe({
      next: () => this.reloadCurrentPage(),
      error: (err) => alert(err.error?.message || 'Delete failed'),
    });
  }

  reloadCurrentPage(): void {
    this.loadUsers({
      page: this.filterService.pageField(),
      size: this.filterService.pageSizeField(),
      search: this.filterService.searchField(),
      sortBy: this.filterService.sortByField(),
      sortOrder: this.filterService.sortOrderField(),
      columnFilters: this.filterService.columnFilters(),
    });
  }

  formatRole(role: string): string {
    return role.replace(/_/g, ' ');
  }
}
