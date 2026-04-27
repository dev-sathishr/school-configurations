import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { finalize } from 'rxjs';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { AuthService } from '../../../../core/services/auth.service';

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

    if (this.form.invalid || this.loading) {
      return;
    }

    this.loading = true;
    const { username, password } = this.form.value;

    // Best-effort geolocation — don't block login if the user denies or the
    // browser has no permission. The session record just won't have lat/lng,
    // which the monitor UI handles.
    this.resolveGeolocation().then((context) => {
      this._authService.login(username, password, context)
        .pipe(finalize(() => { this.loading = false; this._cdr.detectChanges(); }))
        .subscribe({
          next: () => {
            this._router.navigate(['/']);
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Login failed. Please try again.';
          },
        });
    });
  }

  private resolveGeolocation(): Promise<{ latitude?: number; longitude?: number }> {
    if (!navigator?.geolocation) return Promise.resolve({});
    return new Promise((resolve) => {
      // 5s timeout — a slow GPS shouldn't make the user wait indefinitely.
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({}),
        { timeout: 5000, maximumAge: 60_000 },
      );
    });
  }
}
