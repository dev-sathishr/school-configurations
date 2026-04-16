import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FileUploadComponent } from '../../../../../shared/components/file-upload/file-upload.component';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent, FileUploadComponent],
})
export class UserFormComponent implements OnInit {
  @ViewChild('profileUpload') profileUpload!: FileUploadComponent;

  form!: FormGroup;
  editMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';
  groupLabel = '';

  constructor(private cs: CommonService, private fb: FormBuilder, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: [''],
      full_name: ['', Validators.required],
      email: [''],
      phone: [''],
      group_id: ['', Validators.required],
      is_active: [true],
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
        },
        error: () => { this.loading = false; this.cdr.detectChanges(); this.cs.navigate({ url: '/settings/user' }); },
      });
    } else {
      this.form.get('password')?.setValidators(Validators.required);
      this.form.get('password')?.updateValueAndValidity();
    }
  }

  get f() { return this.form.controls; }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) return;

    this.saving = true;
    const data = { ...this.form.value };
    if (this.editMode && !data.password) delete data.password;

    const req = this.editMode
      ? this.cs.putService({ url: `/users/${this.editId}`, payload: data })
      : this.cs.postService({ url: '/users', payload: data });

    req.subscribe({
      next: (res: any) => {
        const createdId = res?.data?.id;
        const pendingUpload = !this.editMode && createdId ? this.profileUpload?.uploadPendingFile(createdId) : null;
        if (pendingUpload) {
          pendingUpload.subscribe({
            next: () => this.navigateAfterSave(),
            error: () => this.navigateAfterSave(),
          });
        } else {
          this.navigateAfterSave();
        }
      },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Something went wrong'; },
    });
  }

  private navigateAfterSave(): void {
    this.saving = false;
    this.cs.navigate({ url: '/settings/user' });
  }

  cancel() { this.cs.navigate({ url: '/settings/user' }); }
}
