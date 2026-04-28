import { Component, inject, signal, ViewChild } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { AddressComponent, Address } from '../../../../../shared/components/address/address.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FileUploadComponent, UploadedFile } from '../../../../../shared/components/file-upload/file-upload.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { LocationFieldComponent } from '../../../../../shared/components/location-field/location-field.component';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import { LocationContextService } from '../../../../../core/services/location-context.service';
import { API } from '../../../../../core/api/endpoints';
import {
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  RELIGION_OPTIONS,
  COMMUNITY_OPTIONS,
} from '../../../../../core/constants/enums';
import * as V from '../../../../../shared/validators/common';
import { EmployeePayrollListComponent } from '../../employee-payroll/employee-payroll-list.component';
import { EmployeePayrollFormComponent } from '../../employee-payroll/employee-payroll-form.component';
import { EmployeeBankAccountListComponent } from '../../employee-bank-account/employee-bank-account-list.component';
import { EmployeeBankAccountFormComponent } from '../../employee-bank-account/employee-bank-account-form.component';
import { EmployeeQualificationListComponent } from '../../employee-qualification/employee-qualification-list.component';
import { EmployeeQualificationFormComponent } from '../../employee-qualification/employee-qualification-form.component';
import { EmployeeExperienceListComponent } from '../../employee-experience/employee-experience-list.component';
import { EmployeeExperienceFormComponent } from '../../employee-experience/employee-experience-form.component';
import { EmployeeDocumentListComponent } from '../../employee-document/employee-document-list.component';
import { EmployeeDocumentFormComponent } from '../../employee-document/employee-document-form.component';
import { EmployeeRelationListComponent } from '../../employee-family/employee-relation-list.component';
import { EmployeeRelationFormComponent } from '../../employee-family/employee-relation-form.component';

type FormTab = 'personal' | 'contact' | 'payroll' | 'bank' | 'qualification' | 'experience' | 'document' | 'family';

@Component({
  selector: 'app-employee-info-form',
  templateUrl: './employee-info-form.component.html',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    FormFieldComponent,
    LoaderComponent,
    AddressComponent,
    BreadcrumbComponent,
    FileUploadComponent,
    LocationFieldComponent,
    EmployeePayrollListComponent,
    EmployeePayrollFormComponent,
    EmployeeBankAccountListComponent,
    EmployeeBankAccountFormComponent,
    EmployeeQualificationListComponent,
    EmployeeQualificationFormComponent,
    EmployeeExperienceListComponent,
    EmployeeExperienceFormComponent,
    EmployeeDocumentListComponent,
    EmployeeDocumentFormComponent,
    EmployeeRelationListComponent,
    EmployeeRelationFormComponent,
    ModalComponent,
  ],
})
export class EmployeeInfoFormComponent extends FormPageBase {
  @ViewChild('photoUpload') photoUpload!: FileUploadComponent;
  @ViewChild('payrollList') payrollList?: EmployeePayrollListComponent;
  @ViewChild('payrollForm') payrollForm?: EmployeePayrollFormComponent;
  @ViewChild('bankList') bankList?: EmployeeBankAccountListComponent;
  @ViewChild('bankForm') bankForm?: EmployeeBankAccountFormComponent;
  @ViewChild('qualificationList') qualificationList?: EmployeeQualificationListComponent;
  @ViewChild('qualificationForm') qualificationForm?: EmployeeQualificationFormComponent;
  @ViewChild('experienceList') experienceList?: EmployeeExperienceListComponent;
  @ViewChild('experienceForm') experienceForm?: EmployeeExperienceFormComponent;
  @ViewChild('documentList') documentList?: EmployeeDocumentListComponent;
  @ViewChild('documentForm') documentForm?: EmployeeDocumentFormComponent;
  @ViewChild('familyList') familyList?: EmployeeRelationListComponent;
  @ViewChild('familyForm') familyForm?: EmployeeRelationFormComponent;

  listRoute = '/employee/employee-info';
  resourcePath = API.employees.base;

  private readonly locationCtx = inject(LocationContextService);

  activeTab = signal<FormTab>('personal');
  readonly recordLocation = signal<{ id: string; name: string; code: string } | null>(null);
  showCreatedDialog = false;
  private createdId = '';

  addresses: Address[] = [];
  addressError = '';
  photo: UploadedFile | null = null;

  readonly genderOptions     = GENDER_OPTIONS;
  readonly bloodGroupOptions = BLOOD_GROUP_OPTIONS;
  readonly maritalOptions    = MARITAL_STATUS_OPTIONS;
  readonly religionOptions   = RELIGION_OPTIONS;
  readonly communityOptions  = COMMUNITY_OPTIONS;

  readonly designationApiUrl = API.designations.dropdown;

  // DOB must be at least 18 years ago; max 100 years ago
  get dobMaxDate(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().slice(0, 10);
  }
  get dobMinDate(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 100);
    return d.toISOString().slice(0, 10);
  }

  private uniqueValidator(field: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = control.value?.number ?? control.value;
      if (!value || !String(value).trim()) return of(null);
      if (field === 'aadhaar_no' && String(value).trim().length !== 12) return of(null);
      return timer(400).pipe(
        switchMap(() => {
          const params: any = { field, value: String(value).trim() };
          if (this.editId) params.exclude_id = this.editId;
          return this.cs.getService({ url: API.employees.checkUnique, params });
        }),
        map((res: any) => res?.data?.available ? null : { notUnique: res?.data?.message || `${field} already exists` }),
        catchError(() => of(null)),
      );
    };
  }

  private dobRangeValidator() {
    return (control: import('@angular/forms').AbstractControl) => {
      const val = control.value;
      if (!val) return null;
      const selected = new Date(val);
      const min = new Date(this.dobMinDate);
      const max = new Date(this.dobMaxDate);
      if (selected > max) return { dobMin: true };
      if (selected < min) return { dobMax: true };
      return null;
    };
  }

  codeLoading = false;
  private skipCodeFetch = false;

  override ngOnInit(): void {
    this.form = this.buildForm();
    const isCreate = !this.cs.getRouteParam(this.route, 'id');

    // Subscribe always — but only act on create mode and only when not patching existing data
    this.form.get('location_id')!.valueChanges.subscribe((locId: string | null) => {
      if (isCreate && !this.skipCodeFetch && locId) this.fetchNextCode(locId);
    });

    if (isCreate) {
      const preferred = this.locationCtx.preferredLocationId();
      if (preferred) {
        this.form.patchValue({ location_id: preferred });
      }
    }

    this.detectModeAndLoad();

    // Auto-switch tab when arriving from the "Add More Details" dialog
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'] as FormTab | undefined;
      if (tab) this.activeTab.set(tab);
    });
  }

  private fetchNextCode(locationId: string): void {
    this.codeLoading = true;
    this.cdr.detectChanges();
    this.cs.getService({ url: API.employees.nextCode, params: { location_id: locationId } }).subscribe({
      next: (res: any) => {
        this.form.patchValue({ employee_code: res?.data?.code || '' });
        this.codeLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.codeLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  refreshCode(): void {
    const locId = this.form.get('location_id')?.value;
    if (locId) this.fetchNextCode(locId);
  }

  protected buildForm(): FormGroup {
    const form = this.fb.group({
      location_id:     ['', Validators.required],
      designation_id:  ['', Validators.required],
      employee_name:   ['', V.requiredRange(2, 200)],
      display_name:    ['', V.maxLength(200)],
      employee_code:   ['', V.requiredMaxLength(50)],
      gender:          ['', Validators.required],
      dob:             ['', [Validators.required, this.dobRangeValidator()]],
      blood_group:     [''],
      marital_status:  [''],
      religion:        [''],
      community:       [''],
      aadhaar_no:      ['', V.maxLength(12), this.uniqueValidator('aadhaar_no')],
      is_active:       [true],
      notes:           ['', V.NOTES],
      primary_phone:   [{ code: '+91', number: '' }, [], this.uniqueValidator('primary_contact_no')],
      secondary_phone: [{ code: '+91', number: '' }, [], this.uniqueValidator('secondary_contact_no')],
      email:           ['', V.EMAIL, this.uniqueValidator('email')],
    });

    // Mirror employee_name → display_name while user hasn't set a custom value.
    // Strategy: track whether display_name was manually edited by comparing it
    // to what we last mirrored. If they're still in sync (or blank), keep mirroring.
    let lastMirrored = '';
    form.get('employee_name')!.valueChanges.subscribe((name: string | null) => {
      const displayCtrl = form.get('display_name')!;
      const displayVal = displayCtrl.value ?? '';
      if (!displayVal || displayVal === lastMirrored) {
        const next = name ?? '';
        displayCtrl.setValue(next, { emitEvent: false });
        lastMirrored = next;
      }
    });

    return form;
  }

  protected override onRecordLoaded(d: any): void {
    this.skipCodeFetch = true;
    this.form.patchValue({
      ...d,
      location_id:    d.location?.id    || '',
      designation_id: d.designation?.id || '',
      dob: d.dob ? String(d.dob).slice(0, 10) : '',
      primary_phone: {
        code:   d.primary_contact_code   || '+91',
        number: d.primary_contact_no     || '',
      },
      secondary_phone: {
        code:   d.secondary_contact_code || '+91',
        number: d.secondary_contact_no   || '',
      },
    });
    this.recordLocation.set(d.location?.id ? {
      id:   d.location.id,
      name: d.location.name || '',
      code: d.location.code || '',
    } : null);
    this.addresses = d.addresses || [];
    this.photo = d.photo || null;
    this.skipCodeFetch = false;
  }

  protected override beforeSubmit(): boolean {
    if (this.hasPersonalErrors) {
      this.personalFields.forEach(f => this.form.get(f)?.markAsTouched());
      this.form.get('aadhaar_no')?.markAsTouched();
      this.activeTab.set('personal');
      this.cs.showToastr({ type: 'error', message: 'Please fix the errors', description: 'Fix all errors in Personal Info before submitting' });
      return false;
    }

    const primaryPhone = this.form.get('primary_phone')?.value;
    if (!primaryPhone?.number?.trim()) {
      this.form.get('primary_phone')?.markAsTouched();
      this.activeTab.set('contact');
      this.cs.showToastr({ type: 'error', message: 'Primary contact is required', description: 'Please enter a primary phone number' });
      return false;
    }

    if (this.addresses.length === 0) {
      this.addressError = 'At least one address is required';
      this.activeTab.set('contact');
      this.cs.showToastr({ type: 'error', message: 'Address is required', description: 'Please add at least one address' });
      return false;
    }

    if (this.form.invalid) {
      this.activeTab.set('contact');
      this.cs.showToastr({ type: 'error', message: 'Please fix the errors', description: 'Fill all required fields before submitting' });
      return false;
    }
    return true;
  }

  protected override toPayload(): any {
    const val = this.form.value;
    const data: any = {
      ...val,
      addresses: this.addresses,
      primary_contact_code:   val.primary_phone?.code   || '+91',
      primary_contact_no:     val.primary_phone?.number || null,
      secondary_contact_code: val.secondary_phone?.code   || '+91',
      secondary_contact_no:   val.secondary_phone?.number || null,
      designation_id: val.designation_id || null,
      dob: val.dob || null,
    };
    delete data.primary_phone;
    delete data.secondary_phone;
    return data;
  }

  protected override afterSave(res: any): void {
    const id = res?.data?.id;
    const pendingUpload = !this.editMode && id ? this.photoUpload?.uploadPendingFile(id) : null;
    if (pendingUpload) {
      pendingUpload.subscribe({
        next:  () => this.onSaveComplete(id),
        error: () => this.onSaveComplete(id),
      });
    } else {
      this.onSaveComplete(id);
    }
  }

  private onSaveComplete(id?: string): void {
    this.saving = false;
    if (!this.editMode && id) {
      this.createdId = id;
      this.showCreatedDialog = true;
      this.cdr.detectChanges();
    } else {
      this.cs.showToastr({ type: 'success', message: 'Employee updated successfully' });
      this.cs.navigate({ url: this.listRoute });
    }
  }

  goToList(): void {
    this.showCreatedDialog = false;
    this.cs.navigate({ url: this.listRoute });
  }

  goToEmployee(tab: FormTab = 'payroll'): void {
    this.showCreatedDialog = false;
    this.cs.navigate({ url: `${this.listRoute}/${this.createdId}/edit`, queryParams: { tab } });
  }

  onAddressesChange(addresses: Address[]): void {
    this.addresses = addresses;
    if (addresses.length > 0) this.addressError = '';
  }

  // Controls that live on the Personal Info tab and must be valid before
  // the user can proceed to Contact Info.
  // employee_code excluded — it's auto-generated on create (always valid) and freely editable on edit
  private readonly personalFields = ['location_id', 'designation_id', 'employee_name', 'gender', 'dob'];

  get isPersonalValid(): boolean {
    return this.personalFields.every(f => this.form.get(f)?.valid);
  }

  private get hasPersonalErrors(): boolean {
    const allPersonalFields = [...this.personalFields, 'aadhaar_no'];
    return allPersonalFields.some(f => this.form.get(f)?.invalid);
  }

  setTab(tab: FormTab): void {
    if (tab === 'payroll' || tab === 'bank' || tab === 'qualification' || tab === 'experience' || tab === 'document') {
      this.activeTab.set(tab);
      return;
    }
    if (!this.viewMode && tab === 'contact' && this.hasPersonalErrors) {
      this.personalFields.forEach(f => this.form.get(f)?.markAsTouched());
      this.form.get('aadhaar_no')?.markAsTouched();
      this.submitted = true;
      this.cs.showToastr({ type: 'error', message: 'Complete Personal Info first', description: 'Fix all errors in Personal Info before proceeding' });
      return;
    }
    this.activeTab.set(tab);
  }
}
