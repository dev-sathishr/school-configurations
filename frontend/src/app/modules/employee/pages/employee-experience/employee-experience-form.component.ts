import { ChangeDetectorRef, Component, EventEmitter, inject, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CommonService } from '../../../../shared/services/common/common.service';
import { API } from '../../../../core/api/endpoints';
import * as V from '../../../../shared/validators/common';

type FormMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-employee-experience-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, ModalComponent],
  template: `
    <app-modal [visible]="showModal" [title]="modalTitle" size="medium" [draggable]="true" (onClose)="closeModal()">
      @if (loading) {
        <app-loader size="small" text="Loading..." />
      } @else {
        <form [formGroup]="form" class="space-y-4">
          <fieldset [disabled]="mode === 'view'" class="space-y-4 disabled:opacity-95">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <app-form-field [formGroup]="form" controlName="organization" label="Organization / Company"
                [required]="true" [submitted]="submitted" placeholder="e.g. ABC School, XYZ Pvt Ltd" [maxLength]="300" />
              <app-form-field [formGroup]="form" controlName="designation" label="Designation / Role"
                [submitted]="submitted" placeholder="e.g. Teacher, Software Engineer" [maxLength]="200" />
              <app-form-field [formGroup]="form" controlName="from_date" label="From Date"
                fieldType="date" [required]="true" [submitted]="submitted" />
              <app-form-field [formGroup]="form" controlName="to_date" label="To Date"
                fieldType="date" [submitted]="submitted" />
            </div>
            <app-form-field [formGroup]="form" controlName="is_current" label="Currently working here" fieldType="checkbox" />
            <div class="mb-4"></div>
            <app-form-field [formGroup]="form" controlName="notes" label="Notes"
              fieldType="textarea" [rows]="2" placeholder="Responsibilities, achievements, reason for leaving..." [maxLength]="500" />
          </fieldset>
          @if (errorMessage) {
            <div class="rounded-md bg-red-50 p-3 text-xs text-red-600">{{ errorMessage }}</div>
          }
        </form>
      }

      <div modal-footer class="flex justify-end gap-3">
        <app-button impact="light" tone="light" shape="rounded" size="medium" type="button" (buttonClick)="closeModal()">
          {{ mode === 'view' ? 'Close' : 'Cancel' }}
        </app-button>
        @if (mode === 'view') {
          <app-button impact="bold" tone="primary" shape="rounded" size="medium" type="button" (buttonClick)="switchToEdit()">
            Edit
          </app-button>
        } @else if (!loading) {
          <app-button impact="bold" tone="primary" shape="rounded" size="medium" type="button" [loading]="saving" (buttonClick)="submit()">
            {{ mode === 'create' ? 'Save' : 'Update' }}
          </app-button>
        }
      </div>
    </app-modal>
  `,
})
export class EmployeeExperienceFormComponent {
  @Output() onSaved = new EventEmitter<void>();

  private fb  = inject(FormBuilder);
  private cs  = inject(CommonService);
  private cdr = inject(ChangeDetectorRef);

  showModal = false;
  mode: FormMode = 'create';
  loading = false;
  saving  = false;
  submitted = false;
  errorMessage = '';

  private employeeId = '';
  private editId = '';

  form: FormGroup = this.buildForm();

  get modalTitle(): string {
    return { create: 'Add Experience', edit: 'Edit Experience', view: 'Experience Details' }[this.mode];
  }

  private buildForm(): FormGroup {
    const form = this.fb.group({
      organization: ['', [Validators.required, Validators.maxLength(300)]],
      designation:  ['', V.maxLength(200)],
      from_date:    ['', Validators.required],
      to_date:      [''],
      is_current:   [false],
      notes:        ['', V.NOTES],
    });

    // When "currently working here" is checked, clear to_date
    form.get('is_current')!.valueChanges.subscribe((val: boolean | null) => {
      if (val) form.get('to_date')!.setValue('', { emitEvent: false });
    });

    return form;
  }

  openCreate(employeeId: string): void {
    this.employeeId = employeeId;
    this.editId = '';
    this.mode = 'create';
    this.form = this.buildForm();
    this.submitted = false;
    this.errorMessage = '';
    this.showModal = true;
  }

  openEdit(employeeId: string, id: string): void {
    this.employeeId = employeeId;
    this.editId = id;
    this.mode = 'edit';
    this.form = this.buildForm();
    this.submitted = false;
    this.errorMessage = '';
    this.loading = true;
    this.showModal = true;
    this.loadRecord(id);
  }

  openView(employeeId: string, id: string): void {
    this.employeeId = employeeId;
    this.editId = id;
    this.mode = 'view';
    this.form = this.buildForm();
    this.submitted = false;
    this.errorMessage = '';
    this.loading = true;
    this.showModal = true;
    this.loadRecord(id);
  }

  private loadRecord(id: string): void {
    this.cs.getService({ url: API.employeeExperience.detail(this.employeeId, id) }).subscribe({
      next: (res: any) => {
        const d = res?.data;
        if (!d) return;
        this.form.patchValue({
          ...d,
          from_date: d.from_date?.slice(0, 10) || '',
          to_date:   d.to_date?.slice(0, 10)   || '',
        }, { emitEvent: false });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.showModal = false;
        this.cdr.markForCheck();
      },
    });
  }

  switchToEdit(): void {
    this.mode = 'edit';
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) return;

    this.saving = true;
    const val = this.form.value;
    const payload = {
      ...val,
      to_date: val.is_current ? null : (val.to_date || null),
    };

    const isCreate = this.mode === 'create';
    const request = isCreate
      ? this.cs.postService({ url: API.employeeExperience.base(this.employeeId), payload })
      : this.cs.putService({ url: API.employeeExperience.detail(this.employeeId, this.editId), payload });

    request.subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.cs.showToastr({ type: 'success', message: 'Saved successfully' });
        this.onSaved.emit();
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Failed to save';
        this.cdr.markForCheck();
      },
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.errorMessage = '';
    this.submitted = false;
  }
}
