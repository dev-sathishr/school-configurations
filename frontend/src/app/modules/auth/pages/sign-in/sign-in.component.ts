import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { finalize } from 'rxjs';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/services/toast/toast.service';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css'],
  imports: [FormsModule, ReactiveFormsModule, AngularSvgIconModule, ButtonComponent, FormFieldComponent],
})
export class SignInComponent implements OnInit {
  form!: FormGroup;
  submitted = false;
  passwordTextType!: boolean;
  loading = false;
  errorMessage = '';

  constructor(
    private readonly _formBuilder: FormBuilder,
    private readonly _router: Router,
    private readonly _authService: AuthService,
    private readonly _toastService: ToastService,
    private readonly _cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this._authService.isLoggedIn()) {
      this._router.navigate(['/']);
    }

    this.form = this._formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  get f() {
    return this.form.controls;
  }

  togglePasswordTextType() {
    this.passwordTextType = !this.passwordTextType;
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';

    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    const { username, password } = this.form.value;

    this._authService.login(username, password)
      .pipe(finalize(() => { this.loading = false; this._cdr.detectChanges(); }))
      .subscribe({
        next: () => {
          this._router.navigate(['/']);
        },
        error: (err) => {
          const message = err.error?.message || 'Login failed. Please try again.';
          this.errorMessage = message;
          this._toastService.error(message);
        },
      });
  }
}
