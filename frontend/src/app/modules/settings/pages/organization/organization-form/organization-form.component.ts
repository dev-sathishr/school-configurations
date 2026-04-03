import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';

@Component({
  selector: 'app-organization-form',
  templateUrl: './organization-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent],
})
export class OrganizationFormComponent implements OnInit {
  form!: FormGroup;
  editMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';

  constructor(private cs: CommonService, private fb: FormBuilder, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/;
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      reg_no: ['', [Validators.maxLength(50)]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      primary_phone: [{ code: '+91', number: '' }],
      alternate_phone: [{ code: '+91', number: '' }],
      website: ['', [Validators.maxLength(200), Validators.pattern(urlPattern)]],
      social_facebook: ['', [Validators.maxLength(200), Validators.pattern(urlPattern)]],
      social_instagram: ['', [Validators.maxLength(200), Validators.pattern(urlPattern)]],
      social_twitter: ['', [Validators.maxLength(200), Validators.pattern(urlPattern)]],
      social_linkedin: ['', [Validators.maxLength(200), Validators.pattern(urlPattern)]],
      social_youtube: ['', [Validators.maxLength(200), Validators.pattern(urlPattern)]],
      is_active: [true],
      notes: ['', [Validators.maxLength(500)]],
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
          this.cdr.detectChanges();
        },
        error: () => { this.loading = false; this.cdr.detectChanges(); this.cs.navigate({ url: '/settings/organization' }); },
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
