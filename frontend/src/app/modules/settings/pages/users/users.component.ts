import { Component, effect, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService, Pagination } from '../../../../core/services/user.service';
import { TableComponent } from '../../../../shared/components/table/table.component';
import { TableFilterService } from '../../../../shared/components/table/services/table-filter.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  imports: [NgClass, FormsModule, ReactiveFormsModule, TableComponent, ButtonComponent],
})
export class UsersComponent implements OnInit {
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
    // React to any filter/page change and reload data
    effect(() => {
      const search = this.filterService.searchField();
      const status = this.filterService.statusField();
      const order = this.filterService.orderField();
      const page = this.filterService.pageField();
      const size = this.filterService.pageSizeField();
      this.loadUsers(page, size, search, status, order);
    });
  }

  ngOnInit(): void {
    this.initForm();
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

  loadUsers(page = 1, size = 10, search = '', status = '', order = ''): void {
    this.loading = true;
    const statusMap: Record<string, string> = { '1': 'active', '2': 'inactive' };
    const orderMap: Record<string, string> = { '1': 'newest', '2': 'oldest' };

    this.userService.getAll({
      page,
      size,
      search: search || undefined,
      status: statusMap[status] || undefined,
      order: orderMap[order] || undefined,
    }).subscribe({
      next: (res) => {
        this.users.set(res.data.map((u) => ({
          ...u,
          name: u.full_name,
          status: u.is_active ? 1 : 2,
          hobbies: [this.formatRole(u.role)],
          occupation: u.created_by_name || '-',
          selected: false,
        })));
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
      full_name: [user.full_name || user.name, Validators.required],
      email: [user.email || ''],
      phone: [user.phone || ''],
      role: [user.role, Validators.required],
      is_active: [user.status === 1],
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

  deleteUser(user: any): void {
    if (!confirm(`Are you sure you want to delete "${user.name}"?`)) return;
    this.userService.delete(user.id).subscribe({
      next: () => this.reloadCurrentPage(),
      error: (err) => alert(err.error?.message || 'Delete failed'),
    });
  }

  reloadCurrentPage(): void {
    this.loadUsers(
      this.filterService.pageField(),
      this.filterService.pageSizeField(),
      this.filterService.searchField(),
      this.filterService.statusField(),
      this.filterService.orderField(),
    );
  }

  formatRole(role: string): string {
    return role.replace(/_/g, ' ');
  }
}
