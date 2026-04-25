import { ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API } from '../../../../../core/api/endpoints';
import { EditLockService } from '../../../../../core/services/edit-lock.service';
import { PermissionService } from '../../../../../core/services/permission.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { CommonService } from '../../../../../shared/services/common/common.service';

type FormMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-designation-form',
  templateUrl: './designation-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, FormFieldComponent, ButtonComponent, LoaderComponent],
})
export class DesignationFormComponent {
  @Output() onSaved = new EventEmitter<void>();

  readonly moduleCode = 'DESIGNATIONS';

  showModal = false;
  mode: FormMode = 'create';
  loading = false;
  saving = false;
  submitted = false;
  editId = '';
  employeeGroupLabel = '';
  recordUpdatedAt = '';
  private lockAcquired = false;
  private lockHeartbeat: ReturnType<typeof setInterval> | null = null;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private cs: CommonService,
    private cdr: ChangeDetectorRef,
    private editLockService: EditLockService,
    public ps: PermissionService
  ) {
    this.form = this.fb.group({
      employee_group_id: ['', Validators.required],
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
    if (this.mode === 'create') return 'New Designation';
    if (this.mode === 'edit') return 'Edit Designation';
    return 'View Designation';
  }

  openCreate(): void {
    if (!this.ps.canCreate(this.moduleCode)) return;
    this.mode = 'create';
    this.editId = '';
    this.submitted = false;
    this.saving = false;
    this.loading = false;
    this.form.reset({
      employee_group_id: '',
      name: '',
      code: '',
      description: '',
      is_active: true,
    });
    this.employeeGroupLabel = '';
    this.form.enable();
    this.showModal = true;
  }

  openEdit(id: string): void {
    if (!this.ps.canEdit(this.moduleCode)) return;
    this.openExisting(id, 'edit');
  }

  switchToEdit(): void {
    this.openEdit(this.editId);
  }

  openView(id: string): void {
    if (!this.ps.canView(this.moduleCode)) return;
    this.openExisting(id, 'view');
  }

  closeModal(): void {
    this.releaseEditLock();
    this.showModal = false;
    this.loading = false;
    this.saving = false;
    this.submitted = false;
    this.editId = '';
    this.employeeGroupLabel = '';
    this.recordUpdatedAt = '';
    this.form.enable();
  }

  submit(): void {
    if (this.viewMode || this.loading) return;

    this.submitted = true;
    if (this.form.invalid) return;

    this.saving = true;
    const payload: any = this.form.value;
    if (this.mode === 'edit') {
      payload.updated_at = this.recordUpdatedAt;
    }
    const request$ = this.mode === 'edit'
      ? this.cs.putService({ url: API.designations.detail(this.editId), payload })
      : this.cs.postService({ url: API.designations.base, payload });

    request$.subscribe({
      next: (res: any) => {
        this.saving = false;
        this.cs.showToastr({ type: 'success', message: res?.message || 'Saved successfully' });
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

    if (mode === 'edit') {
      this.editLockService.acquire(this.moduleCode, id).subscribe({
        next: (res: any) => {
          const lock = res?.data || {};
          if (lock.acquired) {
            this.lockAcquired = true;
            this.startLockHeartbeat();
          }
          this.loadExistingRecord(id);
        },
        error: (err: any) => {
          this.loading = false;
          this.showModal = false;
          this.cs.showToastr({ type: 'error', message: err?.error?.message || 'This record is currently being edited by another user' });
          this.refreshView();
        },
      });
      return;
    }

    this.loadExistingRecord(id);
  }

  private loadExistingRecord(id: string): void {
    this.cs.getService({ url: API.designations.detail(id) }).subscribe({
      next: (res: any) => {
        const data = res.data || res;
        this.form.patchValue({
          employee_group_id: data.employee_group?.id || '',
          name: data.name || '',
          code: data.code || '',
          description: data.description || '',
          is_active: data.is_active !== undefined ? data.is_active : true,
        });
        this.employeeGroupLabel = data.employee_group?.name || '';
        this.recordUpdatedAt = data.updated_at || '';
        if (this.mode === 'view') this.form.disable();
        this.loading = false;
        this.refreshView();
      },
      error: (err: any) => {
        this.releaseEditLock();
        this.loading = false;
        this.showModal = false;
        this.cs.showToastr({ type: 'error', message: err?.error?.message || 'Failed to load record' });
        this.refreshView();
      },
    });
  }

  private startLockHeartbeat(): void {
    if (this.lockHeartbeat) clearInterval(this.lockHeartbeat);
    this.lockHeartbeat = setInterval(() => {
      if (!this.lockAcquired || !this.editId) return;
      this.editLockService.acquire(this.moduleCode, this.editId).subscribe({
        next: () => {},
        error: () => {},
      });
    }, 60_000);
  }

  private stopLockHeartbeat(): void {
    if (!this.lockHeartbeat) return;
    clearInterval(this.lockHeartbeat);
    this.lockHeartbeat = null;
  }

  private releaseEditLock(): void {
    this.stopLockHeartbeat();
    if (!this.lockAcquired || !this.editId) return;

    const recordId = this.editId;
    this.lockAcquired = false;
    this.editLockService.release(this.moduleCode, recordId).subscribe({
      next: () => {},
      error: () => {},
    });
  }

  private refreshView(): void {
    queueMicrotask(() => this.cdr.detectChanges());
  }
}
