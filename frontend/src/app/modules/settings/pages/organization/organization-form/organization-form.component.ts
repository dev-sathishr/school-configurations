import { Component, ViewChild } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { AddressComponent, Address } from '../../../../../shared/components/address/address.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FileUploadComponent, UploadedFile } from '../../../../../shared/components/file-upload/file-upload.component';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import * as V from '../../../../../shared/validators/common';

@Component({
  selector: 'app-organization-form',
  templateUrl: './organization-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, AddressComponent, BreadcrumbComponent, FileUploadComponent],
})
export class OrganizationFormComponent extends FormPageBase {
  @ViewChild('logoUpload') logoUpload!: FileUploadComponent;

  listRoute = '/settings/organization';
  resourcePath = '/organizations';

  addressError = '';
  addresses: Address[] = [];
  logo: UploadedFile | null = null;

  protected buildForm(): FormGroup {
    return this.fb.group({
      name: ['', V.NAME],
      reg_no: ['', V.maxLength(50)],
      email: ['', V.EMAIL],
      primary_phone: [{ code: '+91', number: '' }],
      alternate_phone: [{ code: '+91', number: '' }],
      website: ['', V.URL],
      social_facebook: ['', V.URL],
      social_instagram: ['', V.URL],
      social_twitter: ['', V.URL],
      social_linkedin: ['', V.URL],
      social_youtube: ['', V.URL],
      is_active: [true],
      notes: ['', V.NOTES],
    });
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
        next: () => this.navigateAfterSave(),
        error: () => this.navigateAfterSave(),
      });
    } else {
      this.navigateAfterSave();
    }
  }

  private navigateAfterSave(): void {
    this.saving = false;
    this.cs.showToastr({
      type: 'success',
      message: this.editMode ? 'Organization updated' : 'Organization created',
      description: this.editMode ? 'Changes saved successfully' : 'New organization has been added',
    });
    this.cs.navigate({ url: this.listRoute });
  }

  protected override handleSaveError(err: any): void {
    super.handleSaveError(err);
    this.cs.showToastr({ type: 'error', message: 'Failed to save', description: this.errorMessage });
  }

  onAddressesChange(addresses: Address[]): void {
    this.addresses = addresses;
    if (addresses.length > 0) this.addressError = '';
  }
}
