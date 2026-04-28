import { Component } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { AddressComponent, Address } from '../../../../../shared/components/address/address.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import { API } from '../../../../../core/api/endpoints';
import { LOCATION_TYPE_OPTIONS } from '../../../../../core/constants/enums';
import * as V from '../../../../../shared/validators/common';

@Component({
  selector: 'app-location-form',
  templateUrl: './location-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, AddressComponent, BreadcrumbComponent],
})
export class LocationFormComponent extends FormPageBase {
  listRoute = '/settings/location';
  resourcePath = API.locations.base;

  addressError = '';
  orgLabel = '';
  addresses: Address[] = [];

  locationTypes = LOCATION_TYPE_OPTIONS;

  private uniqueValidator(field: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = control.value?.number ?? control.value;
      if (!value || !String(value).trim()) return of(null);
      return timer(400).pipe(
        switchMap(() => {
          const params: any = { field, value: String(value).trim() };
          if (this.editId) params.exclude_id = this.editId;
          return this.cs.getService({ url: API.locations.checkUnique, params });
        }),
        map((res: any) => res?.data?.available ? null : { notUnique: res?.data?.message || 'Already registered' }),
        catchError(() => of(null)),
      );
    };
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      organization_id: ['', Validators.required],
      name: ['', V.NAME],
      code: ['', V.SHORT_CODE],
      type: ['branch', Validators.required],
      email: ['', V.EMAIL, this.uniqueValidator('email')],
      primary_phone: [{ code: '+91', number: '' }, [], this.uniqueValidator('primary_contact_no')],
      alternate_phone: [{ code: '+91', number: '' }, [], this.uniqueValidator('alternate_contact_no')],
      is_active: [true],
      notes: ['', V.NOTES],
    });
  }

  protected override onRecordLoaded(d: any): void {
    this.form.patchValue({
      ...d,
      organization_id: d.organization?.id || '',
      primary_phone: { code: d.primary_contact_code || '+91', number: d.primary_contact_no || '' },
      alternate_phone: { code: d.alternate_contact_code || '+91', number: d.alternate_contact_no || '' },
    });
    this.orgLabel = d.organization?.name || '';
    this.addresses = d.addresses || [];
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
      primary_contact_code: val.primary_phone?.code || '+91',
      primary_contact_no: val.primary_phone?.number || null,
      alternate_contact_code: val.alternate_phone?.code || '+91',
      alternate_contact_no: val.alternate_phone?.number || null,
      addresses: this.addresses,
    };
    delete data.primary_phone;
    delete data.alternate_phone;
    return data;
  }

  protected override afterSave(res: any): void {
    this.saving = false;
    this.cs.showToastr({ type: 'success', message: res?.message || 'Saved successfully' });
    this.cs.navigate({ url: this.listRoute });
  }

  onAddressesChange(addresses: Address[]): void {
    this.addresses = addresses;
    if (addresses.length > 0) this.addressError = '';
  }
}
