import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { PermissionService } from '../../../../../core/services/permission.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-permission-form',
  templateUrl: './permission-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent],
})
export class PermissionFormComponent implements OnInit {
  form!: FormGroup;
  editMode = false;
  viewMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';

  constructor(private cs: CommonService, private fb: FormBuilder, private route: ActivatedRoute, private cdr: ChangeDetectorRef, public ps: PermissionService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
      description: [''],
      is_active: [true],
    });

    const id = this.cs.getRouteParam(this.route, 'id');
    if (id) {
      const segments = this.route.snapshot.url;
      const lastPath = segments[segments.length - 1]?.path;
      this.viewMode = lastPath === 'view';
      this.editMode = !this.viewMode;
      this.editId = id;
      this.loading = true;
      this.cs.getService({ url: `/permissions/${id}` }).subscribe({
        next: (res: any) => {
          this.form.patchValue(res.permission || res.data || res);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => { this.loading = false; this.cdr.detectChanges(); this.cs.navigate({ url: '/settings/permission' }); },
      });
    }
  }

  get f() { return this.form.controls; }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) return;

    this.saving = true;
    const data = { ...this.form.value };

    const req = this.editMode
      ? this.cs.putService({ url: `/permissions/${this.editId}`, payload: data })
      : this.cs.postService({ url: '/permissions', payload: data });

    req.subscribe({
      next: () => { this.saving = false; this.cs.navigate({ url: '/settings/permission' }); },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Something went wrong'; },
    });
  }

  cancel() { this.cs.navigate({ url: '/settings/permission' }); }

  switchToEdit() { this.cs.navigate({ url: `/settings/permission/${this.editId}/edit` }); }
}
