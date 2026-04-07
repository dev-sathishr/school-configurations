import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent, SelectOption } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { AddressComponent, Address } from '../../../../../shared/components/address/address.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-location-form',
  templateUrl: './location-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, AddressComponent, BreadcrumbComponent],
})
export class LocationFormComponent implements OnInit {
  form!: FormGroup;
  editMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';
  addressError = '';
  organizations: any[] = [];
  organizationOptions: SelectOption[] = [];
  addresses: Address[] = [];

  locationTypes = [
    { value: 'main_branch', label: 'Main Branch' },
    { value: 'branch', label: 'Branch' },
    { value: 'campus', label: 'Campus' },
    { value: 'annexure', label: 'Annexure' },
    { value: 'hostel', label: 'Hostel' },
    { value: 'playground', label: 'Playground' },
    { value: 'other', label: 'Other' },
  ];

  constructor(private cs: CommonService, private fb: FormBuilder, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      organization_id: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      code: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(5)]],
      type: ['branch', Validators.required],
      email: ['', [Validators.maxLength(100), Validators.email]],
      primary_phone: [{ code: '+91', number: '' }],
      alternate_phone: [{ code: '+91', number: '' }],
      is_active: [true],
      notes: ['', [Validators.maxLength(500)]],
    });

    this.cs.getService({ url: '/organizations/dropdown' }).subscribe({
      next: (res: any) => {
        this.organizations = res.data;
        this.organizationOptions = res.data.map((o: any) => ({ value: o.id, label: o.name }));
      },
    });

    const id = this.cs.getRouteParam(this.route, 'id');
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.loading = true;
      this.cs.getService({ url: `/locations/${id}` }).subscribe({
        next: (res: any) => {
          const d = res.data;
          this.form.patchValue({
            ...d,
            primary_phone: { code: d.primary_contact_code || '+91', number: d.primary_contact_no || '' },
            alternate_phone: { code: d.alternate_contact_code || '+91', number: d.alternate_contact_no || '' },
          });
          this.addresses = d.addresses || [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => { this.loading = false; this.cdr.detectChanges(); this.cs.navigate({ url: '/settings/location' }); },
      });
    }
  }

  get f() { return this.form.controls; }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    this.addressError = this.addresses.length === 0 ? 'At least one address is required' : '';
    if (this.form.invalid || this.addressError) {
      this.cs.showToastr({ type: 'error', message: 'Please fix the errors', description: 'Fill all required fields before submitting' });
      return;
    }

    this.saving = true;
    const val = this.form.value;
    const data = {
      ...val,
      primary_contact_code: val.primary_phone?.code || '+91',
      primary_contact_no: val.primary_phone?.number || null,
      alternate_contact_code: val.alternate_phone?.code || '+91',
      alternate_contact_no: val.alternate_phone?.number || null,
      addresses: this.addresses,
    };
    delete data.primary_phone;
    delete data.alternate_phone;

    const req = this.editMode
      ? this.cs.putService({ url: `/locations/${this.editId}`, payload: data })
      : this.cs.postService({ url: '/locations', payload: data });

    req.subscribe({
      next: () => {
        this.saving = false;
        this.cs.showToastr({ type: 'success', message: this.editMode ? 'Location updated' : 'Location created', description: this.editMode ? 'Changes saved successfully' : 'New location has been added' });
        this.cs.navigate({ url: '/settings/location' });
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Something went wrong';
        this.cs.showToastr({ type: 'error', message: 'Failed to save', description: this.errorMessage });
      },
    });
  }

  onAddressesChange(addresses: Address[]): void {
    this.addresses = addresses;
    if (addresses.length > 0) this.addressError = '';
  }

  cancel() { this.cs.navigate({ url: '/settings/location' }); }
}
