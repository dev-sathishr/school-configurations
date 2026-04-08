import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent, SelectOption } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent, NgClass],
})
export class UserFormComponent implements OnInit {
  form!: FormGroup;
  editMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';

  roles = [
    'super_admin', 'admin', 'principal', 'vice_principal', 'hod',
    'teacher', 'class_teacher', 'accountant', 'librarian', 'clerk',
    'lab_assistant', 'transport_manager', 'student', 'parent',
  ];

  roleOptions = this.roles.map(r => ({ value: r, label: r.replace(/_/g, ' ') }));

  // User group
  groupLabel = '';

  // Location assignment
  allLocations: any[] = [];
  userLocations: { location_id: string; is_default: boolean }[] = [];

  constructor(private cs: CommonService, private fb: FormBuilder, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: [''],
      full_name: ['', Validators.required],
      email: [''],
      phone: [''],
      role: ['clerk', Validators.required],
      user_group_id: [''],
      is_active: [true],
    });

    // Load all locations for assignment
    this.cs.getService({ url: '/locations', params: { page: 1, size: 200 } }).subscribe({
      next: (res: any) => {
        this.allLocations = res.data || [];
        this.cdr.detectChanges();
      },
    });

    const id = this.cs.getRouteParam(this.route, 'id');
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.loading = true;
      this.cs.getService({ url: `/users/${id}` }).subscribe({
        next: (res: any) => {
          const user = res.user || res.data || res;
          this.form.patchValue(user);
          this.groupLabel = user.group_name || '';
          this.form.get('password')?.clearValidators();
          this.form.get('password')?.updateValueAndValidity();
          this.loading = false;
          this.cdr.detectChanges();

          // Load user's assigned locations
          this.cs.getService({ url: `/user-locations/user/${id}` }).subscribe({
            next: (locRes: any) => {
              this.userLocations = (locRes.data || []).map((l: any) => ({
                location_id: l.location_id,
                is_default: l.is_default,
              }));
              this.cdr.detectChanges();
            },
          });
        },
        error: () => { this.loading = false; this.cdr.detectChanges(); this.cs.navigate({ url: '/settings/user' }); },
      });
    } else {
      this.form.get('password')?.setValidators(Validators.required);
      this.form.get('password')?.updateValueAndValidity();
    }
  }

  get f() { return this.form.controls; }

  isLocationAssigned(locationId: string): boolean {
    return this.userLocations.some((l) => l.location_id === locationId);
  }

  isDefaultLocation(locationId: string): boolean {
    return this.userLocations.some((l) => l.location_id === locationId && l.is_default);
  }

  toggleLocation(locationId: string): void {
    const idx = this.userLocations.findIndex((l) => l.location_id === locationId);
    if (idx >= 0) {
      const wasDefault = this.userLocations[idx].is_default;
      this.userLocations.splice(idx, 1);
      // If removed the default, set first remaining as default
      if (wasDefault && this.userLocations.length > 0) {
        this.userLocations[0].is_default = true;
      }
    } else {
      this.userLocations.push({ location_id: locationId, is_default: this.userLocations.length === 0 });
    }
  }

  setDefaultLocation(locationId: string): void {
    this.userLocations.forEach((l) => (l.is_default = l.location_id === locationId));
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) return;

    this.saving = true;
    const data = { ...this.form.value };
    if (this.editMode && !data.password) delete data.password;

    const saveUser = this.editMode
      ? this.cs.putService({ url: `/users/${this.editId}`, payload: data })
      : this.cs.postService({ url: '/users', payload: data });

    saveUser.subscribe({
      next: (res: any) => {
        const userId = this.editMode ? this.editId : (res.user?.id || res.data?.id);

        // Save location assignments if any
        if (this.userLocations.length > 0 && userId) {
          this.cs.putService({ url: `/user-locations/user/${userId}`, payload: { locations: this.userLocations } }).subscribe({
            next: () => { this.saving = false; this.cs.navigate({ url: '/settings/user' }); },
            error: () => { this.saving = false; this.cs.navigate({ url: '/settings/user' }); },
          });
        } else {
          this.saving = false;
          this.cs.navigate({ url: '/settings/user' });
        }
      },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Something went wrong'; },
    });
  }

  cancel() { this.cs.navigate({ url: '/settings/user' }); }
}
