import { ChangeDetectorRef, Component, EventEmitter, inject, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CommonService } from '../../../../shared/services/common/common.service';
import { DEGREE_OPTIONS } from '../../../../core/constants/enums';
import { API } from '../../../../core/api/endpoints';
import * as V from '../../../../shared/validators/common';

type FormMode = 'create' | 'edit' | 'view';

const CURRENT_YEAR = new Date().getFullYear();

@Component({
  selector: 'app-employee-qualification-form',
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
              <app-form-field [formGroup]="form" controlName="degree" label="Degree / Certificate"
                fieldType="select" [options]="degreeOptions" [required]="true" [submitted]="submitted" />
              <app-form-field [formGroup]="form" controlName="field_of_study" label="Field of Study / Specialization"
                [submitted]="submitted" placeholder="e.g. Mathematics, Computer Science" [maxLength]="200" />
              <app-form-field [formGroup]="form" controlName="institution" label="Institution / College / School"
                [required]="true" [submitted]="submitted" placeholder="e.g. Anna University" [maxLength]="300" />
              <app-form-field [formGroup]="form" controlName="board_university" label="Board / University"
                [submitted]="submitted" placeholder="e.g. State Board, CBSE" [maxLength]="300" />
              <app-form-field [formGroup]="form" controlName="year_of_passing" label="Year of Passing"
                [submitted]="submitted" placeholder="e.g. 2018" [maxLength]="4" [digitsOnly]="true" />
              <app-form-field [formGroup]="form" controlName="grade" label="Grade / Percentage / CGPA"
                [submitted]="submitted" placeholder="e.g. 85%, 8.5 CGPA, First Class" [maxLength]="50" />
            </div>
            <app-form-field [formGroup]="form" controlName="notes" label="Notes"
              fieldType="textarea" [rows]="2" placeholder="Any additional details..." [maxLength]="500" />
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
export class EmployeeQualificationFormComponent {
  @Output() onSaved = new EventEmitter<void>();

  private fb  = inject(FormBuilder);
  private cs  = inject(CommonService);
  private cdr = inject(ChangeDetectorRef);

  readonly degreeOptions = DEGREE_OPTIONS;

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
    return { create: 'Add Qualification', edit: 'Edit Qualification', view: 'Qualification Details' }[this.mode];
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      degree:           ['', Validators.required],
      field_of_study:   ['', V.maxLength(200)],
      institution:      ['', [Validators.required, Validators.maxLength(300)]],
      board_university: ['', V.maxLength(300)],
      year_of_passing:  ['', [Validators.maxLength(4), Validators.pattern(/^\d{0,4}$/)]],
      grade:            ['', V.maxLength(50)],
      notes:            ['', V.NOTES],
    });
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
    this.cs.getService({ url: API.employeeQualifications.detail(this.employeeId, id) }).subscribe({
      next: (res: any) => {
        const d = res?.data;
        if (!d) return;
        this.form.patchValue({
          ...d,
          year_of_passing: d.year_of_passing != null ? String(d.year_of_passing) : '',
        });
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
      year_of_passing: val.year_of_passing ? Number(val.year_of_passing) : null,
    };

    const isCreate = this.mode === 'create';
    const request = isCreate
      ? this.cs.postService({ url: API.employeeQualifications.base(this.employeeId), payload })
      : this.cs.putService({ url: API.employeeQualifications.detail(this.employeeId, this.editId), payload });

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
