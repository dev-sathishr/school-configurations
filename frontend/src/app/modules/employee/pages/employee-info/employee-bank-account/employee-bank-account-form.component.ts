import { ChangeDetectorRef, Component, EventEmitter, inject, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { BANK_ACCOUNT_TYPE_OPTIONS } from '../../../../../core/constants/enums';
import { API } from '../../../../../core/api/endpoints';
import * as V from '../../../../../shared/validators/common';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

type FormMode = 'create' | 'edit' | 'view';

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

@Component({
  selector: 'app-employee-bank-account-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, ModalComponent],
  template: `
    <app-modal [visible]="showModal" [title]="modalTitle" size="medium" [draggable]="true" (onClose)="closeModal()">
      @if (loading) {
        <app-loader size="small" text="Loading..." />
      } @else {
        <form [formGroup]="form" class="space-y-5">
          <fieldset [disabled]="mode === 'view'" class="space-y-5 disabled:opacity-95">

            <!-- IFSC first â€” drives bank_name and branch_name -->
            <div class="space-y-1">
              <app-form-field [formGroup]="form" controlName="ifsc_code" label="IFSC Code"
                [submitted]="submitted" placeholder="e.g. SBIN0001234" [maxLength]="11" [uppercase]="true" />
              @if (ifscLookupState === 'loading') {
                <p class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
                  Looking up IFSC...
                </p>
              } @else if (ifscLookupState === 'found') {
                <p class="text-[11px] text-green-600">&#10003; Bank details auto-filled from IFSC</p>
              } @else if (ifscLookupState === 'error') {
                <p class="text-[11px] text-amber-600">IFSC not found â€” please fill bank details manually</p>
              }
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <app-form-field [formGroup]="form" controlName="bank_name" label="Bank Name"
                [required]="true" [submitted]="submitted" placeholder="e.g. State Bank of India" [maxLength]="100" />
              <app-form-field [formGroup]="form" controlName="branch_name" label="Branch Name"
                [submitted]="submitted" placeholder="e.g. Anna Nagar Branch" [maxLength]="100" />
              <app-form-field [formGroup]="form" controlName="account_no" label="Account No"
                [required]="true" [submitted]="submitted" placeholder="Account number" [maxLength]="50" [digitsOnly]="true" />
              <app-form-field [formGroup]="form" controlName="account_type" label="Account Type"
                fieldType="select" [options]="accountTypeOptions" [required]="true" [submitted]="submitted" />
              <app-form-field [formGroup]="form" controlName="account_holder" label="Account Holder Name"
                [required]="true" [submitted]="submitted" placeholder="Name as per bank records" [maxLength]="200" [uppercase]="true" />
            </div>
            <app-form-field [formGroup]="form" controlName="is_active" label="Set as Active Account" fieldType="checkbox" />

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
export class EmployeeBankAccountFormComponent {
  @Output() onSaved = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private cs = inject(CommonService);
  private cdr = inject(ChangeDetectorRef);

  readonly accountTypeOptions = BANK_ACCOUNT_TYPE_OPTIONS;

  showModal = false;
  mode: FormMode = 'create';
  loading = false;
  saving = false;
  submitted = false;
  errorMessage = '';
  ifscLookupState: 'idle' | 'loading' | 'found' | 'error' = 'idle';

  private employeeId = '';
  private editId = '';

  form: FormGroup = this.buildForm();

  get modalTitle(): string {
    const labels: Record<FormMode, string> = {
      create: 'Add Bank Account',
      edit:   'Edit Bank Account',
      view:   'Bank Account Details',
    };
    return labels[this.mode];
  }

  private buildForm(isFirst = false): FormGroup {
    const form = this.fb.group({
      ifsc_code:      ['', [Validators.maxLength(11), Validators.pattern(IFSC_PATTERN)]],
      bank_name:      ['', [Validators.required, Validators.maxLength(100)]],
      branch_name:    ['', Validators.maxLength(100)],
      account_no:     ['', [Validators.required, Validators.maxLength(50)]],
      account_holder: ['', [Validators.required, Validators.maxLength(200)]],
      account_type:   ['savings', Validators.required],
      is_active:      [isFirst],
    });

    form.get('ifsc_code')!.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
    ).subscribe((val: string | null) => {
      const code = (val || '').toUpperCase().trim();
      if (IFSC_PATTERN.test(code)) {
        this.lookupIfsc(code);
      } else {
        this.ifscLookupState = 'idle';
      }
    });

    return form;
  }

  private lookupIfsc(ifsc: string): void {
    this.ifscLookupState = 'loading';
    this.cdr.markForCheck();

    this.cs.getService({ url: API.ifsc.lookup(ifsc) }).subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (data && data.BANK) {
          this.form.patchValue({
            bank_name:   data.BANK   || '',
            branch_name: data.BRANCH || '',
          }, { emitEvent: false });
          this.ifscLookupState = 'found';
        } else {
          this.ifscLookupState = 'error';
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.ifscLookupState = 'error';
        this.cdr.markForCheck();
      },
    });
  }

  openCreate(employeeId: string, isFirst: boolean): void {
    this.employeeId = employeeId;
    this.editId = '';
    this.mode = 'create';
    this.form = this.buildForm(isFirst);
    this.submitted = false;
    this.errorMessage = '';
    this.ifscLookupState = 'idle';
    this.showModal = true;
  }

  openEdit(employeeId: string, id: string): void {
    this.employeeId = employeeId;
    this.editId = id;
    this.mode = 'edit';
    this.form = this.buildForm();
    this.submitted = false;
    this.errorMessage = '';
    this.ifscLookupState = 'idle';
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
    this.ifscLookupState = 'idle';
    this.loading = true;
    this.showModal = true;
    this.loadRecord(id);
  }

  private loadRecord(id: string): void {
    this.cs.getService({ url: API.employeeBankAccounts.detail(this.employeeId, id) }).subscribe({
      next: (res: any) => {
        const d = res?.data;
        if (!d) return;
        this.form.patchValue(d, { emitEvent: false });
        this.ifscLookupState = d.ifsc_code ? 'found' : 'idle';
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
    // re-subscribe to IFSC changes now that the fieldset is enabled
    const current = this.form.getRawValue();
    this.form = this.buildForm();
    this.form.patchValue(current, { emitEvent: false });
    this.ifscLookupState = current.ifsc_code ? 'found' : 'idle';
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) return;

    this.saving = true;
    const payload = { ...this.form.value, id: this.editId || undefined };
    const url = API.employeeBankAccounts.base(this.employeeId);

    const request = this.mode === 'create'
      ? this.cs.postService({ url, payload })
      : this.cs.postService({ url, payload });

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
    this.ifscLookupState = 'idle';
  }
}
