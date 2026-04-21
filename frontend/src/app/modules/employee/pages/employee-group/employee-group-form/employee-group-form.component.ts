import { ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API } from '../../../../../core/api/endpoints';
import { PermissionService } from '../../../../../core/services/permission.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { CommonService } from '../../../../../shared/services/common/common.service';

type FormMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-employee-group-form',
  templateUrl: './employee-group-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, FormFieldComponent, ButtonComponent, LoaderComponent],
})
export class EmployeeGroupFormComponent {
  @Output() onSaved = new EventEmitter<void>();

  readonly moduleCode = 'EMPLOYEE_GROUPS';

  showModal = false;
  mode: FormMode = 'create';
  loading = false;
  saving = false;
  submitted = false;
  editId = '';
  employeeCategoryLabel = '';

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private cs: CommonService,
    private cdr: ChangeDetectorRef,
    public ps: PermissionService
  ) {
    this.form = this.fb.group({
      employee_category_id: ['', Validators.required],
      name: ['', Validators.required],
      code: ['', Validators.required],
      description: [''],
      is_active: [true],
    });
  }

  get viewMode(): boolean {
    return this.mode === 'view';
  }

  get title(): string {
    if (this.mode === 'create') return 'New Employee Group';
    if (this.mode === 'edit') return 'Edit Employee Group';
    return 'View Employee Group';
  }

  openCreate(): void {
    if (!this.ps.canCreate(this.moduleCode)) return;
    this.mode = 'create';
    this.editId = '';
    this.submitted = false;
    this.saving = false;
    this.loading = false;
    this.form.reset({
      employee_category_id: '',
      name: '',
      code: '',
      description: '',
      is_active: true,
    });
    this.employeeCategoryLabel = '';
    this.form.enable();
    this.showModal = true;
  }

  openEdit(id: string): void {
    if (!this.ps.canEdit(this.moduleCode)) return;
    this.openExisting(id, 'edit');
  }

  openView(id: string): void {
    if (!this.ps.canView(this.moduleCode)) return;
    this.openExisting(id, 'view');
  }

  closeModal(): void {
    this.showModal = false;
    this.loading = false;
    this.saving = false;
    this.submitted = false;
    this.editId = '';
    this.employeeCategoryLabel = '';
    this.form.enable();
  }

  submit(): void {
    if (this.viewMode || this.loading) return;

    this.submitted = true;
    if (this.form.invalid) return;

    this.saving = true;
    const payload = this.form.value;
    const request$ = this.mode === 'edit'
      ? this.cs.putService({ url: API.employeeGroups.detail(this.editId), payload })
      : this.cs.postService({ url: API.employeeGroups.base, payload });

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.cs.showToastr({
          type: 'success',
          message: this.mode === 'edit' ? 'Employee group updated' : 'Employee group created',
        });
        this.closeModal();
        this.onSaved.emit();
        this.refreshView();
      },
      error: (err: any) => {
        this.saving = false;
        this.cs.showToastr({ type: 'error', message: err?.error?.message || 'Something went wrong' });
        this.refreshView();
      },
    });
  }

  private openExisting(id: string, mode: 'edit' | 'view'): void {
    if (!id) return;
    this.mode = mode;
    this.editId = id;
    this.showModal = true;
    this.loading = true;
    this.saving = false;
    this.submitted = false;
    this.form.enable();

    this.cs.getService({ url: API.employeeGroups.detail(id) }).subscribe({
      next: (res: any) => {
        const data = res.data || res;
        this.form.patchValue({
          employee_category_id: data.employee_category_id || '',
          name: data.name || '',
          code: data.code || '',
          description: data.description || '',
          is_active: data.is_active !== undefined ? data.is_active : true,
        });
        this.employeeCategoryLabel = data.employee_category_name || '';
        if (this.mode === 'view') this.form.disable();
        this.loading = false;
        this.refreshView();
      },
      error: (err: any) => {
        this.loading = false;
        this.showModal = false;
        this.cs.showToastr({ type: 'error', message: err?.error?.message || 'Failed to load record' });
        this.refreshView();
      },
    });
  }

  private refreshView(): void {
    queueMicrotask(() => this.cdr.detectChanges());
  }
}
