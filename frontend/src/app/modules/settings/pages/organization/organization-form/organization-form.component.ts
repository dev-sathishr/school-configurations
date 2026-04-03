import { Component, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { PhoneInputComponent } from '../../../../../shared/components/phone-input/phone-input.component';

@Component({
  selector: 'app-organization-form',
  templateUrl: './organization-form.component.html',
  imports: [NgClass, ReactiveFormsModule, ButtonComponent, PhoneInputComponent],
})
export class OrganizationFormComponent implements OnInit {
  form!: FormGroup;
  editMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';

  constructor(private cs: CommonService, private fb: FormBuilder, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      reg_no: [''],
      email: ['', Validators.email],
      primary_phone: [{ code: '+91', number: '' }],
      alternate_phone: [{ code: '+91', number: '' }],
      website: [''],
      social_facebook: [''],
      social_instagram: [''],
      social_twitter: [''],
      social_linkedin: [''],
      social_youtube: [''],
      is_active: [true],
      notes: [''],
    });

    const id = this.cs.getRouteParam(this.route, 'id');
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.loading = true;
      this.cs.getService({ url: `/organizations/${id}` }).subscribe({
        next: (res: any) => {
          const d = res.data;
          this.form.patchValue({
            ...d,
            primary_phone: { code: d.primary_contact_code || '+91', number: d.primary_contact_no || '' },
            alternate_phone: { code: d.alternate_contact_code || '+91', number: d.alternate_contact_no || '' },
          });
          this.loading = false;
        },
        error: () => { this.loading = false; this.cs.navigate({ url: '/settings/organization' }); },
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

    const req = this.editMode
      ? this.cs.putService({ url: `/organizations/${this.editId}`, payload: data })
      : this.cs.postService({ url: '/organizations', payload: data });

    req.subscribe({
      next: () => { this.saving = false; this.cs.navigate({ url: '/settings/organization' }); },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Something went wrong'; },
    });
  }

  cancel() { this.cs.navigate({ url: '/settings/organization' }); }
}
