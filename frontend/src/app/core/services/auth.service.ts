import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ToastService } from '../../shared/services/toast/toast.service';

interface LoginResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  group_id: string;
  group_code: string;
  group_name: string;
  last_login: string;
  profile_file_id: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;

  // Signal-based source of truth. The `currentUser$` observable is a thin
  // facade for legacy / template `| async` consumers; new code should read
  // the signal directly (`authService.currentUser` getter already unwraps).
  private readonly _currentUser = signal<User | null>(this.getStoredUser());
  public readonly currentUser$ = toObservable(this._currentUser);

  private loggingOut = false;

  constructor(private http: HttpClient, private router: Router, private toast: ToastService) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { username, password }).pipe(
      tap((res) => {
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('refresh_token', res.refresh_token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this._currentUser.set(res.user);
        this.toast.success('Signed in', `Welcome back, ${res.user.full_name || res.user.username}`);
      })
    );
  }

  logout(): void {
    if (this.loggingOut) return;
    this.loggingOut = true;
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
      complete: () => {
        this.clearSession();
        this.loggingOut = false;
        this.toast.info('Signed out', 'See you next time');
      },
      error: () => {
        this.clearSession();
        this.loggingOut = false;
        this.toast.info('Signed out', 'See you next time');
      },
    });
  }

  private clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this._currentUser.set(null);
    // Navigate first — AuthGuard will block re-entry and PermissionService
    // resets its loaded flag on next login via the guard
    this.router.navigate(['/auth/sign-in']);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /** Synchronous snapshot. Reads the signal. */
  get currentUser(): User | null {
    return this._currentUser();
  }

  private getStoredUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}
