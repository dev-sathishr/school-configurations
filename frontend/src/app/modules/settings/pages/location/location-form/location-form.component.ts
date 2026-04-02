import { Component, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LocationService } from '../../../../../core/services/location.service';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { PhoneInputComponent } from '../../../../../shared/components/phone-input/phone-input.component';

@Component({
  selector: 'app-location-form',
  templateUrl: './location-form.component.html',
  imports: [NgClass, ReactiveFormsModule, ButtonComponent, PhoneInputComponent],
})
export class LocationFormComponent implements OnInit {
  form!: FormGroup;
  editMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';
  organizations: any[] = [];

  locationTypes = [
    { value: 'main_branch', label: 'Main Branch' },
    { value: 'branch', label: 'Branch' },
    { value: 'campus', label: 'Campus' },
    { value: 'annexure', label: 'Annexure' },
    { value: 'hostel', label: 'Hostel' },
    { value: 'playground', label: 'Playground' },
    { value: 'other', label: 'Other' },
  ];

  constructor(
    private fb: FormBuilder,
    private locationService: LocationService,
    private orgService: OrganizationService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      organization_id: ['', Validators.required],
      name: ['', Validators.required],
      code: [''],
      type: ['branch'],
      email: [''],
      primary_phone: [{ code: '+91', number: '' }],
      alternate_phone: [{ code: '+91', number: '' }],
      address_line1: [''],
      address_line2: [''],
      city: [''],
      state: [''],
      pincode: [''],
      country: ['India'],
      is_active: [true],
      notes: [''],
    });

    this.orgService.getDropdown().subscribe({
      next: (res: any) => { this.organizations = res.data; },
    });

    const id = this.route.snapshot.params['id'];
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.loading = true;
      this.locationService.getById(id).subscribe({
        next: (res: any) => {
          const d = res.data;
          this.form.patchValue({
            ...d,
            primary_phone: { code: d.primary_contact_code || '+91', number: d.primary_contact_no || '' },
            alternate_phone: { code: d.alternate_contact_code || '+91', number: d.alternate_contact_no || '' },
          });
          this.loading = false;
        },
        error: () => { this.loading = false; this.router.navigate(['/settings/location']); },
      });
    }
  }

  get f() { return this.form.controls; }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) return;

    this.saving = true;
    const val = this.form.value;
    const data = {
      ...val,
      primary_contact_code: val.primary_phone?.code || '+91',
      primary_contact_no: val.primary_phone?.number || null,
      alternate_contact_code: val.alternate_phone?.code || '+91',
      alternate_contact_no: val.alternate_phone?.number || null,
    };
    delete data.primary_phone;
    delete data.alternate_phone;
    const req = this.editMode ? this.locationService.update(this.editId, data) : this.locationService.create(data);

    req.subscribe({
      next: () => { this.saving = false; this.router.navigate(['/settings/location']); },
      error: (err) => { this.saving = false; this.errorMessage = err.error?.message || 'Something went wrong'; },
    });
  }

  cancel() { this.router.navigate(['/settings/location']); }
}
