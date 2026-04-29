import { ChangeDetectorRef, Component, EventEmitter, inject, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { LoaderComponent } from '../loader/loader.component';
import { ModalComponent } from '../modal/modal.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { AddressComponent, Address } from '../address/address.component';
import { CommonService } from '../../services/common/common.service';
import { RELATION_TYPE_OPTIONS, GENDER_OPTIONS } from '../../../core/constants/enums';
import * as V from '../../validators/common';

type FormMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-relation-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    ButtonComponent, FormFieldComponent, LoaderComponent,
    ModalComponent, ConfirmDialogComponent, AddressComponent,
  ],
  template: `
    <app-modal [visible]="showModal" [title]="modalTitle" size="large" [draggable]="true" (onClose)="closeModal()">
      @if (loading) {
        <app-loader size="small" text="Loading..." />
      } @else {
        <form [formGroup]="form" class="space-y-5">
          <fieldset [disabled]="mode === 'view'" class="space-y-5 disabled:opacity-95">

            <div class="bg-background border-muted/30 rounded-lg border p-4">
              <h4 class="text-foreground mb-3 text-xs font-semibold">Identity</h4>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <app-form-field [formGroup]="form" controlName="relation_type" label="Relation Type"
                  fieldType="select" [options]="relationTypeOptions" [required]="true" [submitted]="submitted" />
                <app-form-field [formGroup]="form" controlName="name" label="Name"
                  [required]="true" [submitted]="submitted" placeholder="Full name"
                  [minLength]="2" [maxLength]="200" [uppercase]="true" />
                <app-form-field [formGroup]="form" controlName="gender" label="Gender"
                  fieldType="select" [options]="genderOptions" placeholder="Select gender"
                  [required]="true" [submitted]="submitted" />
                <app-form-field [formGroup]="form" controlName="dob" label="Date of Birth"
                  fieldType="date" />
                <app-form-field [formGroup]="form" controlName="aadhaar_no" label="Aadhaar No"
                  placeholder="12-digit Aadhaar number" [maxLength]="12" [digitsOnly]="true" [submitted]="submitted" />
              </div>
            </div>

            <div class="bg-background border-muted/30 rounded-lg border p-4">
              <h4 class="text-foreground mb-3 text-xs font-semibold">Contact</h4>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <app-form-field [formGroup]="form" controlName="contact" label="Contact Number"
                  fieldType="phone" placeholder="Phone number" />
                <app-form-field [formGroup]="form" controlName="email" label="Email"
                  fieldType="email" placeholder="e.g. name@email.com" [maxLength]="100" [submitted]="submitted" />
              </div>
            </div>

            <div class="bg-background border-muted/30 rounded-lg border p-4">
              <h4 class="text-foreground mb-3 text-xs font-semibold">Professional</h4>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <app-form-field [formGroup]="form" controlName="occupation" label="Occupation"
                  placeholder="e.g. Teacher, Farmer" [maxLength]="200" />
                <app-form-field [formGroup]="form" controlName="qualification" label="Qualification"
                  placeholder="e.g. B.Sc, M.A" [maxLength]="100" />
                <app-form-field [formGroup]="form" controlName="annual_income" label="Annual Income (₹)"
                  fieldType="number" placeholder="e.g. 300000" />
              </div>
            </div>

            <app-address [addresses]="addresses" [errorMessage]="addressError" (addressesChange)="onAddressesChange($event)" />

            <div class="bg-background border-muted/30 rounded-lg border p-4">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <app-form-field [formGroup]="form" controlName="is_emergency_contact"
                  label="Emergency Contact" fieldType="checkbox" />
                <app-form-field [formGroup]="form" controlName="notes" label="Notes"
                  fieldType="textarea" [rows]="2" placeholder="Any additional notes..." [maxLength]="500" />
              </div>
            </div>

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

    <app-confirm-dialog
      [visible]="showDeleteConfirm"
      title="Delete Relation Record"
      message="Are you sure you want to delete this relation record? This action cannot be undone."
      confirmText="Delete"
      tone="danger"
      (onConfirm)="confirmDelete()"
      (onCancel)="showDeleteConfirm = false" />
  `,
})
export class RelationFormComponent {
  @Output() onSaved      = new EventEmitter<void>();
  @Output() onDeleted    = new EventEmitter<void>();
  @Output() onLocalSaved = new EventEmitter<any>();

  private fb  = inject(FormBuilder);
  private cs  = inject(CommonService);
  private cdr = inject(ChangeDetectorRef);

  readonly relationTypeOptions = RELATION_TYPE_OPTIONS;
  readonly genderOptions       = GENDER_OPTIONS;

  showModal         = false;
  showDeleteConfirm = false;
  mode: FormMode    = 'create';
  loading           = false;
  saving            = false;
  submitted         = false;
  errorMessage      = '';
  addressError      = '';
  addresses: Address[] = [];

  private baseUrl    = '';
  private detailUrl  = (id: string) => `${this.baseUrl}/${id}`;
  private editId     = '';
  private deleteId   = '';
  private localMode  = false;
  private localIndex: number | undefined = undefined;

  form: FormGroup = this.buildForm();

  get modalTitle(): string {
    return { create: 'Add Family Member', edit: 'Edit Family Member', view: 'Family Member Details' }[this.mode];
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      relation_type:        ['', Validators.required],
      name:                 ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      gender:               ['', Validators.required],
      dob:                  [''],
      contact:              [{ code: '+91', number: '' }],
      email:                ['', V.EMAIL],
      aadhaar_no:           ['', [Validators.maxLength(12), Validators.pattern(/^\d{0,12}$/)]],
      occupation:           ['', Validators.maxLength(200)],
      qualification:        ['', Validators.maxLength(100)],
      annual_income:        [null],
      is_emergency_contact: [false],
      notes:                ['', V.NOTES],
    });
  }

  onAddressesChange(addresses: Address[]): void {
    this.addresses = addresses;
    if (addresses.length > 0) this.addressError = '';
  }

  openCreate(baseUrl: string): void {
    this.localMode    = false;
    this.localIndex   = undefined;
    this.baseUrl      = baseUrl;
    this.editId       = '';
    this.mode         = 'create';
    this.form         = this.buildForm();
    this.addresses    = [];
    this.submitted    = false;
    this.errorMessage = '';
    this.addressError = '';
    this.showModal    = true;
  }

  openEdit(baseUrl: string, id: string): void {
    this.baseUrl      = baseUrl;
    this.editId       = id;
    this.mode         = 'edit';
    this.form         = this.buildForm();
    this.addresses    = [];
    this.submitted    = false;
    this.errorMessage = '';
    this.addressError = '';
    this.loading      = true;
    this.showModal    = true;
    this.loadRecord(id);
  }

  openView(baseUrl: string, id: string): void {
    this.baseUrl      = baseUrl;
    this.editId       = id;
    this.mode         = 'view';
    this.form         = this.buildForm();
    this.addresses    = [];
    this.submitted    = false;
    this.errorMessage = '';
    this.addressError = '';
    this.loading      = true;
    this.showModal    = true;
    this.loadRecord(id);
  }

  openDelete(id: string): void {
    this.deleteId          = id;
    this.showDeleteConfirm = true;
  }

  // ── Local mode (create form — no API calls, emits data back to parent) ──

  openLocalCreate(): void {
    this.localMode    = true;
    this.localIndex   = undefined;
    this.mode         = 'create';
    this.form         = this.buildForm();
    this.addresses    = [];
    this.submitted    = false;
    this.errorMessage = '';
    this.addressError = '';
    this.showModal    = true;
  }

  openLocalEdit(data: any, index: number): void {
    this.localMode    = true;
    this.localIndex   = index;
    this.mode         = 'edit';
    this.form         = this.buildForm();
    this.addresses    = data.addresses || [];
    this.submitted    = false;
    this.errorMessage = '';
    this.addressError = '';
    this.form.patchValue({
      ...data,
      contact:       { code: data.contact_code || '+91', number: data.contact_no || '' },
      aadhaar_no:    data.aadhaar_no    || '',
      annual_income: data.annual_income ?? null,
    });
    this.showModal    = true;
  }

  openLocalView(data: any, index: number): void {
    this.localMode    = true;
    this.localIndex   = index;
    this.mode         = 'view';
    this.form         = this.buildForm();
    this.addresses    = data.addresses || [];
    this.submitted    = false;
    this.errorMessage = '';
    this.addressError = '';
    this.form.patchValue({
      ...data,
      contact:       { code: data.contact_code || '+91', number: data.contact_no || '' },
      aadhaar_no:    data.aadhaar_no    || '',
      annual_income: data.annual_income ?? null,
    });
    this.showModal    = true;
  }

  private loadRecord(id: string): void {
    this.cs.getService({ url: `${this.baseUrl}/${id}` }).subscribe({
      next: (res: any) => {
        const d = res?.data;
        if (!d) return;
        this.form.patchValue({
          ...d,
          contact:       { code: d.contact_code || '+91', number: d.contact_no || '' },
          aadhaar_no:    d.aadhaar_no    || '',
          annual_income: d.annual_income ?? null,
        });
        this.addresses = d.addresses || [];
        this.loading   = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading   = false;
        this.showModal = false;
        this.cdr.markForCheck();
      },
    });
  }

  switchToEdit(): void {
    this.mode = 'edit';
  }

  submit(): void {
    this.submitted    = true;
    this.errorMessage = '';
    this.addressError = this.addresses.length === 0 ? 'At least one address is required' : '';
    if (this.form.invalid || this.addressError) return;

    const val      = this.form.value;
    const payload: any = {
      ...val,
      contact_code:  val.contact?.code   || '+91',
      contact_no:    val.contact?.number || null,
      aadhaar_no:    val.aadhaar_no       || null,
      annual_income: val.annual_income    || null,
      addresses:     this.addresses,
    };
    delete payload.contact;

    if (this.localMode) {
      if (this.localIndex !== undefined) payload._localIndex = this.localIndex;
      this.showModal = false;
      this.onLocalSaved.emit(payload);
      return;
    }

    this.saving = true;
    const isEdit  = this.mode === 'edit';
    const url     = isEdit ? `${this.baseUrl}/${this.editId}` : this.baseUrl;
    const request = isEdit
      ? this.cs.putService({ url, payload })
      : this.cs.postService({ url, payload });

    request.subscribe({
      next: () => {
        this.saving    = false;
        this.showModal = false;
        this.cs.showToastr({ type: 'success', message: isEdit ? 'Relation updated' : 'Relation added' });
        this.onSaved.emit();
      },
      error: (err: any) => {
        this.saving       = false;
        this.errorMessage = err?.error?.message || 'Failed to save';
        this.cdr.markForCheck();
      },
    });
  }

  confirmDelete(): void {
    this.showDeleteConfirm = false;
    this.cs.deleteService({ url: `${this.baseUrl}/${this.deleteId}` }).subscribe({
      next: () => {
        this.cs.showToastr({ type: 'success', message: 'Relation deleted' });
        this.onDeleted.emit();
      },
      error: (err: any) => {
        this.cs.showToastr({ type: 'error', message: err?.error?.message || 'Failed to delete' });
      },
    });
  }

  closeModal(): void {
    this.showModal    = false;
    this.errorMessage = '';
    this.addressError = '';
    this.submitted    = false;
    this.localMode    = false;
    this.localIndex   = undefined;
  }
}
