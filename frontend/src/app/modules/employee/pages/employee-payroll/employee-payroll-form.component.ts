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

type FormMode = 'create' | 'edit' | 'view' | 'rejoin';

const WAGE_TYPE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'daily',   label: 'Daily' },
  { value: 'hourly',  label: 'Hourly' },
];

@Component({
  selector: 'app-employee-payroll-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, ModalComponent],
  template: `
    <app-modal [visible]="showModal" [title]="modalTitle" size="large" (onClose)="closeModal()">
      @if (loading) {
        <app-loader size="small" text="Loading..." />
      } @else {
        <form [formGroup]="form" class="space-y-5">
          <fieldset [disabled]="mode === 'view'" class="space-y-5 disabled:opacity-95">

            <!-- Employment Period -->
            <div>
              <h5 class="text-foreground mb-3 text-xs font-semibold uppercase tracking-wide">Employment Period</h5>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <app-form-field [formGroup]="form" controlName="joining_date" label="Joining Date"
                  fieldType="date" [required]="true" [submitted]="submitted" />
                <app-form-field [formGroup]="form" controlName="probation_end_date" label="Probation End Date"
                  fieldType="date" [submitted]="submitted" />
                @if (mode === 'edit' || mode === 'view') {
                  <app-form-field [formGroup]="form" controlName="relieving_date" label="Relieving Date"
                    fieldType="date" [submitted]="submitted" />
                  <app-form-field [formGroup]="form" controlName="relieving_reason" label="Relieving Reason"
                    [submitted]="submitted" placeholder="e.g. Resigned, Retired" [maxLength]="200" />
                }
              </div>
            </div>

            <!-- Salary -->
            <div>
              <h5 class="text-foreground mb-3 text-xs font-semibold uppercase tracking-wide">Salary</h5>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <app-form-field [formGroup]="form" controlName="wage_type" label="Wage Type"
                  fieldType="select" [options]="wageTypeOptions" [required]="true" [submitted]="submitted" />
                <app-form-field [formGroup]="form" controlName="basic_salary" label="Basic Salary (₹)"
                  [submitted]="submitted" placeholder="e.g. 25000" [maxLength]="10" [digitsOnly]="true" />
                <app-form-field [formGroup]="form" controlName="day_wages" label="Day Wages (₹)"
                  [submitted]="submitted" placeholder="e.g. 850" [maxLength]="10" [digitsOnly]="true" />
                <app-form-field [formGroup]="form" controlName="biometric_id" label="Biometric ID"
                  [submitted]="submitted" placeholder="e.g. BIO-001" [maxLength]="50" />
              </div>
            </div>

            <!-- Statutory -->
            <div>
              <h5 class="text-foreground mb-3 text-xs font-semibold uppercase tracking-wide">Statutory</h5>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <app-form-field [formGroup]="form" controlName="epf_applicable" label="EPF Applicable" fieldType="checkbox" />
                @if (form.get('epf_applicable')?.value) {
                  <app-form-field [formGroup]="form" controlName="epf_uan_no" label="EPF UAN No"
                    [submitted]="submitted" placeholder="12-digit UAN" [maxLength]="12" [digitsOnly]="true" />
                  <app-form-field [formGroup]="form" controlName="pf_no" label="PF No"
                    [submitted]="submitted" placeholder="e.g. MH/BAN/12345/000/0000001" [maxLength]="22" [uppercase]="true" />
                }
                <app-form-field [formGroup]="form" controlName="esi_applicable" label="ESI Applicable" fieldType="checkbox" />
                @if (form.get('esi_applicable')?.value) {
                  <app-form-field [formGroup]="form" controlName="esi_no" label="ESI No"
                    [submitted]="submitted" placeholder="17-digit ESI number" [maxLength]="17" [digitsOnly]="true" />
                }
                <app-form-field [formGroup]="form" controlName="pan_no" label="PAN No"
                  [submitted]="submitted" placeholder="e.g. ABCDE1234F" [maxLength]="10" [uppercase]="true" />
              </div>
            </div>

            <!-- Notes -->
            <app-form-field [formGroup]="form" controlName="notes" label="Notes"
              fieldType="textarea" [rows]="2" placeholder="Any additional notes..." [maxLength]="500" />

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
            {{ mode === 'create' || mode === 'rejoin' ? 'Save' : 'Update' }}
          </app-button>
        }
      </div>
    </app-modal>
  `,
})
export class EmployeePayrollFormComponent {
  @Output() onSaved = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private cs = inject(CommonService);
  private cdr = inject(ChangeDetectorRef);

  readonly wageTypeOptions = WAGE_TYPE_OPTIONS;

  showModal = false;
  mode: FormMode = 'create';
  loading = false;
  saving = false;
  submitted = false;
  errorMessage = '';

  private employeeId = '';
  private editId = '';

  form: FormGroup = this.buildForm();

  get modalTitle(): string {
    const labels: Record<FormMode, string> = {
      create:  'Add Payroll',
      edit:    'Edit Payroll Period',
      view:    'Payroll Details',
      rejoin:  'Add Rejoin Period',
    };
    return labels[this.mode];
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      joining_date:       ['', Validators.required],
      relieving_date:     [''],
      relieving_reason:   ['', V.maxLength(200)],
      probation_end_date: [''],
      wage_type:          ['monthly', Validators.required],
      basic_salary:       ['', [Validators.maxLength(10), Validators.pattern(/^\d*$/)]],
      day_wages:          ['', [Validators.maxLength(10), Validators.pattern(/^\d*$/)]],
      biometric_id:       ['', V.maxLength(50)],
      epf_applicable:     [false],
      epf_uan_no:         ['', [Validators.minLength(12), Validators.maxLength(12), Validators.pattern(/^\d*$/)]],
      pf_no:              ['', V.maxLength(22)],
      esi_applicable:     [false],
      esi_no:             ['', [Validators.minLength(17), Validators.maxLength(17), Validators.pattern(/^\d*$/)]],
      pan_no:             ['', [Validators.maxLength(10), Validators.minLength(10), Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)]],
      notes:              ['', V.NOTES],
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

  openRejoin(employeeId: string): void {
    this.employeeId = employeeId;
    this.editId = '';
    this.mode = 'rejoin';
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
    this.cs.getService({ url: API.employeePayroll.detail(this.employeeId, id) }).subscribe({
      next: (res: any) => {
        const d = res?.data;
        if (!d) return;
        this.form.patchValue({
          ...d,
          joining_date:       d.joining_date?.slice(0, 10) || '',
          relieving_date:     d.relieving_date?.slice(0, 10) || '',
          probation_end_date: d.probation_end_date?.slice(0, 10) || '',
          basic_salary:       d.basic_salary != null ? String(d.basic_salary) : '',
          day_wages:          d.day_wages != null ? String(d.day_wages) : '',
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
      basic_salary: val.basic_salary ? Number(val.basic_salary) : null,
      day_wages:    val.day_wages    ? Number(val.day_wages)    : null,
    };

    const url = this.mode === 'create'
      ? API.employeePayroll.base(this.employeeId)
      : this.mode === 'rejoin'
      ? API.employeePayroll.rejoin(this.employeeId)
      : API.employeePayroll.detail(this.employeeId, this.editId);

    const request = (this.mode === 'create' || this.mode === 'rejoin')
      ? this.cs.postService({ url, payload })
      : this.cs.putService({ url, payload });

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
      },
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.errorMessage = '';
    this.submitted = false;
  }
}
