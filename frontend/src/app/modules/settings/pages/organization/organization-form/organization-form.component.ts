import { Component, ViewChild } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, FormGroup, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { AddressComponent, Address } from '../../../../../shared/components/address/address.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FileUploadComponent, UploadedFile } from '../../../../../shared/components/file-upload/file-upload.component';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import { API } from '../../../../../core/api/endpoints';
import * as V from '../../../../../shared/validators/common';

@Component({
  selector: 'app-organization-form',
  templateUrl: './organization-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, AddressComponent, BreadcrumbComponent, FileUploadComponent],
})
export class OrganizationFormComponent extends FormPageBase {
  @ViewChild('logoUpload') logoUpload!: FileUploadComponent;

  listRoute = '/settings/organization';
  resourcePath = API.organizations.base;

  addressError = '';
  addresses: Address[] = [];
  logo: UploadedFile | null = null;

  private uniqueValidator(field: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = control.value?.number ?? control.value;
      if (!value || !String(value).trim()) return of(null);
      return timer(400).pipe(
        switchMap(() => {
          const params: any = { field, value: String(value).trim() };
          if (this.editId) params.exclude_id = this.editId;
          return this.cs.getService({ url: API.organizations.checkUnique, params });
        }),
        map((res: any) => res?.data?.available ? null : { notUnique: res?.data?.message || 'Already registered' }),
        catchError(() => of(null)),
      );
    };
  }

  protected buildForm(): FormGroup {
    const form = this.fb.group({
      name: ['', V.NAME],
      reg_no: ['', V.maxLength(50)],
      email: ['', V.EMAIL, this.uniqueValidator('email')],
      primary_phone: [{ code: '+91', number: '' }, [], this.uniqueValidator('primary_contact_no')],
      alternate_phone: [{ code: '+91', number: '' }, [], this.uniqueValidator('alternate_contact_no')],
      website: ['', V.URL],
      social_facebook: ['', V.URL],
      social_instagram: ['', V.URL],
      social_twitter: ['', V.URL],
      social_linkedin: ['', V.URL],
      social_youtube: ['', V.URL],
      is_active: [true],
      notes: ['', V.NOTES],
    });
    return form;
  }

  protected override onRecordLoaded(d: any): void {
    this.form.patchValue({
      ...d,
      primary_phone: { code: d.primary_contact_code || '+91', number: d.primary_contact_no || '' },
      alternate_phone: { code: d.alternate_contact_code || '+91', number: d.alternate_contact_no || '' },
    });
    this.addresses = d.addresses || [];
    this.logo = d.logo || null;
  }

  protected override beforeSubmit(): boolean {
    this.addressError = this.addresses.length === 0 ? 'At least one address is required' : '';
    if (this.addressError || this.form.invalid) {
      this.cs.showToastr({ type: 'error', message: 'Please fix the errors', description: 'Fill all required fields before submitting' });
    }
    return !this.addressError;
  }

  protected override toPayload(): any {
    const val = this.form.value;
    const data: any = {
      ...val,
      addresses: this.addresses,
      primary_contact_code: val.primary_phone?.code || '+91',
      primary_contact_no: val.primary_phone?.number || null,
      alternate_contact_code: val.alternate_phone?.code || '+91',
      alternate_contact_no: val.alternate_phone?.number || null,
    };
    delete data.primary_phone;
    delete data.alternate_phone;
    return data;
  }

  // If the user picked a logo before the org existed, chain the upload after
  // create succeeds (we now have the parent id). Navigate either way so a
  // failed upload doesn't strand the user on the form.
  protected override afterSave(res: any): void {
    const createdId = res?.data?.id;
    const pendingUpload = !this.editMode && createdId ? this.logoUpload?.uploadPendingFile(createdId) : null;
    if (pendingUpload) {
      pendingUpload.subscribe({
        next: () => this.navigateAfterSave(res?.message),
        error: () => this.navigateAfterSave(res?.message),
      });
    } else {
      this.navigateAfterSave(res?.message);
    }
  }

  private navigateAfterSave(message?: string): void {
    this.saving = false;
    this.cs.showToastr({ type: 'success', message: message || 'Saved successfully' });
    this.cs.navigate({ url: this.listRoute });
  }

  onAddressesChange(addresses: Address[]): void {
    this.addresses = addresses;
    if (addresses.length > 0) this.addressError = '';
  }
}
