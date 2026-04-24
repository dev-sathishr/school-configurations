import { ChangeDetectorRef, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API } from '../../../../../../core/api/endpoints';
import { EditLockService } from '../../../../../../core/services/edit-lock.service';
import { LocationContextService } from '../../../../../../core/services/location-context.service';
import { PermissionService } from '../../../../../../core/services/permission.service';
import { ButtonComponent } from '../../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../../shared/components/loader/loader.component';
import { LocationFieldComponent } from '../../../../../../shared/components/location-field/location-field.component';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { CommonService } from '../../../../../../shared/services/common/common.service';
import * as V from '../../../../../../shared/validators/common';

type FormMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-class-level-form',
  templateUrl: './class-level-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, FormFieldComponent, ButtonComponent, LoaderComponent, LocationFieldComponent],
})
export class ClassLevelFormComponent {
  @Output() onSaved = new EventEmitter<void>();

  readonly moduleCode = 'CLASS_LEVELS';
  readonly locationCtx = inject(LocationContextService);
  readonly sectionOptions = Array.from({ length: 26 }, (_, i) => {
    const letter = String.fromCharCode(65 + i);
    return { value: letter, label: letter };
  });

  showModal = false;
  mode: FormMode = 'create';
  loading = false;
  saving = false;
  submitted = false;
  editId = '';
  classLabel = '';
  recordUpdatedAt = '';
  private currentClassCode = '';
  private lockAcquired = false;
  private lockHeartbeat: ReturnType<typeof setInterval> | null = null;

  readonly recordLocation = signal<{ id: string; name: string; code: string } | null>(null);

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private cs: CommonService,
    private cdr: ChangeDetectorRef,
    private editLockService: EditLockService,
    public ps: PermissionService
  ) {
    this.form = this.fb.group({
      location_id: ['', Validators.required],
      class_general_id: ['', Validators.required],
      section: [''],
      code: ['', V.requiredMaxLength(100)],
      capacity: [0],
      is_active: [true],
      notes: ['', V.NOTES],
    });

    this.form.get('class_general_id')?.valueChanges.subscribe((classId: string) => this.onClassChange(classId));
    this.form.get('section')?.valueChanges.subscribe(() => this.updateGeneratedCode());
  }

  get viewMode(): boolean {
    return this.mode === 'view';
  }

  get title(): string {
    if (this.mode === 'create') return 'New Class Level';
    if (this.mode === 'edit') return 'Edit Class Level';
    return 'View Class Level';
  }

  openCreate(): void {
    if (!this.ps.canCreate(this.moduleCode)) return;
    const preferredLocationId = this.locationCtx.preferredLocationId() || '';
    this.mode = 'create';
    this.editId = '';
    this.classLabel = '';
    this.currentClassCode = '';
    this.submitted = false;
    this.saving = false;
    this.loading = false;
    this.recordUpdatedAt = '';
    this.recordLocation.set(null);
    this.form.reset({
      location_id: preferredLocationId,
      class_general_id: '',
      section: '',
      code: '',
      capacity: 0,
      is_active: true,
      notes: '',
    });
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
    this.classLabel = '';
    this.currentClassCode = '';
    this.recordUpdatedAt = '';
    this.recordLocation.set(null);
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
      ? this.cs.putService({ url: API.classLevels.detail(this.editId), payload })
      : this.cs.postService({ url: API.classLevels.base, payload });

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
    this.recordUpdatedAt = '';
    this.currentClassCode = '';
    this.recordLocation.set(null);
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
    this.cs.getService({ url: API.classLevels.detail(id) }).subscribe({
      next: (res: any) => {
        const data = res.data || res;
        this.form.patchValue({
          location_id: data.location_id || '',
          class_general_id: data.class_general_id || '',
          section: data.section || '',
          code: data.code || '',
          capacity: data.capacity ?? 0,
          is_active: data.is_active !== undefined ? data.is_active : true,
          notes: data.notes || '',
        });
        this.classLabel = data.class_code ? `${data.class_name} (${data.class_code})` : (data.class_name || '');
        this.currentClassCode = data.class_code || '';
        this.recordLocation.set(data.location_id ? {
          id: data.location_id,
          name: data.location_name || '',
          code: data.location_code || '',
        } : null);
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

  private onClassChange(classId: string): void {
    if (!classId) {
      this.classLabel = '';
      this.currentClassCode = '';
      return;
    }

    if (this.mode !== 'create') return;
    this.cs.getService({ url: API.classes.detail(classId) }).subscribe({
      next: (res: any) => {
        const data = res?.data || {};
        this.currentClassCode = data.code || data.name || '';
        this.updateGeneratedCode();
      },
      error: () => {
        this.currentClassCode = '';
      },
    });
  }

  private updateGeneratedCode(): void {
    if (this.mode !== 'create') return;
    const section = this.form.get('section')?.value;
    if (this.currentClassCode && section) {
      this.form.patchValue({ code: `${this.currentClassCode} ${section}` }, { emitEvent: false });
    }
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
