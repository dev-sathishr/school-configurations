import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, AngularSvgIconModule, ButtonComponent, FormFieldComponent],
})
export class SignInComponent implements OnInit {
  form!: FormGroup;
  submitted = signal(false);
  passwordTextType = signal(false);
  loading = signal(false);
  errorMessage = signal('');

  constructor(
    private readonly _formBuilder: FormBuilder,
    private readonly _router: Router,
    private readonly _authService: AuthService,
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
    this.passwordTextType.update((v) => !v);
  }

  onSubmit() {
    this.submitted.set(true);
    this.errorMessage.set('');

    if (this.form.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    const { username, password } = this.form.value;

    this.resolveGeolocation().then((context) => {
      this._authService.login(username, password, context)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: () => {
            this._router.navigate(['/']);
          },
          error: (err) => {
            this.errorMessage.set(err.error?.message || 'Login failed. Please try again.');
          },
        });
    });
  }

  private resolveGeolocation(): Promise<{ latitude?: number; longitude?: number }> {
    if (!navigator?.geolocation) return Promise.resolve({});
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({}),
        { timeout: 5000, maximumAge: 60_000 },
      );
    });
  }
}
