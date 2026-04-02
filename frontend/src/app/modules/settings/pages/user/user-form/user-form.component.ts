import { Component, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../../../core/services/user.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  imports: [NgClass, ReactiveFormsModule, ButtonComponent],
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

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: [''],
      full_name: ['', Validators.required],
      email: [''],
      phone: [''],
      role: ['clerk', Validators.required],
      is_active: [true],
    });

    const id = this.route.snapshot.params['id'];
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.loading = true;
      this.userService.getById(id).subscribe({
        next: (res: any) => {
          const data = res.user || res;
          this.form.patchValue(data);
          this.form.get('password')?.clearValidators();
          this.form.get('password')?.updateValueAndValidity();
          this.loading = false;
        },
        error: () => { this.loading = false; this.router.navigate(['/settings/user']); },
      });
    } else {
      this.form.get('password')?.setValidators(Validators.required);
      this.form.get('password')?.updateValueAndValidity();
    }
  }

  get f() { return this.form.controls; }

  formatRole(role: string): string { return role.replace(/_/g, ' '); }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) return;

    this.saving = true;
    const data = { ...this.form.value };
    if (this.editMode && !data.password) delete data.password;

    const req = this.editMode ? this.userService.update(this.editId, data) : this.userService.create(data);

    req.subscribe({
      next: () => { this.saving = false; this.router.navigate(['/settings/user']); },
      error: (err) => { this.saving = false; this.errorMessage = err.error?.message || 'Something went wrong'; },
    });
  }

  cancel() { this.router.navigate(['/settings/user']); }
}
