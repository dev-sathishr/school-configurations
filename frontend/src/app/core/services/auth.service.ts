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

  /**
   * Sign in. `context` optionally carries the browser's geolocation so the
   * backend can stamp the session row with lat/lng. If geolocation was
   * denied or unavailable, we just don't send it — login still works, the
   * session record simply has no location.
   */
  login(
    username: string,
    password: string,
    context: { latitude?: number; longitude?: number; location_label?: string } = {},
  ): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { username, password, ...context }).pipe(
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

  /** Epoch milliseconds when the current access token expires, or null if
   *  no token / malformed. Used by `SessionTimeoutService` to schedule the
   *  warning modal and the hard-logout fallback. */
  getTokenExpiryMs(): number | null {
    const token = this.getToken();
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    const exp = payload?.['exp'];
    return typeof exp === 'number' ? exp * 1000 : null;
  }

  /** Mint a new access token using the stored refresh token. Resolves with
   *  the new expiry ms so the timeout service can reschedule; rejects (or
   *  resolves null) if refresh fails — caller should log the user out. */
  refreshAccessToken(): Observable<{ access_token: string }> {
    const refreshToken = localStorage.getItem('refresh_token');
    return this.http.post<{ access_token: string }>(`${this.apiUrl}/auth/refresh`, { refresh_token: refreshToken }).pipe(
      tap((res) => {
        localStorage.setItem('access_token', res.access_token);
      })
    );
  }

  /**
   * True only when we hold a token that hasn't expired yet. We decode the
   * JWT client-side purely to check `exp` — signature verification stays
   * server-side. Expired / malformed tokens are cleared as a side effect so
   * the next caller doesn't trigger the bootstrap forkJoin against a dead
   * token and produce the classic "401s on the sign-in page" console noise.
   */
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const payload = decodeJwtPayload(token);
    const exp = payload?.['exp'];
    if (typeof exp !== 'number' || exp * 1000 <= Date.now()) {
      this.dropStoredSession();
      return false;
    }
    return true;
  }

  /** Clear the local session without hitting the logout endpoint. Used when
   *  the server-side session is already gone (e.g. bootstrap 401/404) and
   *  we don't want to loop-attempt a logout on a dead token. */
  dropStoredSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this._currentUser.set(null);
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

/**
 * Decode a JWT's payload without verifying the signature. JWTs use base64url
 * (`-` / `_` and no padding) so plain `atob` can choke — normalize first.
 * Returns `null` for anything malformed so callers can treat it as "no token".
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}
