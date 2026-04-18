import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-class-general-form',
  templateUrl: './class-general-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent],
})
export class ClassGeneralFormComponent implements OnInit {
  form!: FormGroup;
  editMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';

  academicLevelOptions = [
    { value: 'nursery', label: 'Nursery' },
    { value: 'primary', label: 'Primary' },
    { value: 'middle', label: 'Middle' },
    { value: 'secondary', label: 'Secondary' },
    { value: 'higher_secondary', label: 'Higher Secondary' },
  ];

  constructor(private cs: CommonService, private fb: FormBuilder, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      code: ['', [Validators.maxLength(50)]],
      strength: [0],
      academic_level: ['primary', Validators.required],
      is_active: [true],
      notes: ['', [Validators.maxLength(500)]],
    });

    const id = this.cs.getRouteParam(this.route, 'id');
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.loading = true;
      this.cs.getService({ url: `/classes/${id}` }).subscribe({
        next: (res: any) => {
          this.form.patchValue(res.data);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => { this.loading = false; this.cs.navigate({ url: '/academic/class' }); },
      });
    }
  }

  get f() { return this.form.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) return;

    this.saving = true;
    const data = this.form.value;

    const req = this.editMode
      ? this.cs.putService({ url: `/classes/${this.editId}`, payload: data })
      : this.cs.postService({ url: '/classes', payload: data });

    req.subscribe({
      next: (res: any) => {
        this.saving = false;
        const createdId = res?.data?.id;
        this.cs.showToastr({
          type: 'success',
          message: this.editMode ? 'Class updated' : 'Class created',
          description: this.editMode ? 'Changes saved successfully' : 'New class has been added',
        });
        if (!this.editMode && createdId) {
          // After create, navigate to edit page on Levels tab
          this.cs.navigate({ url: `/academic/class/${createdId}/edit`, queryParams: { tab: 'levels' } });
        } else {
          this.cs.navigate({ url: '/academic/class' });
        }
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Something went wrong';
      },
    });
  }

  cancel() { this.cs.navigate({ url: '/academic/class' }); }
}
