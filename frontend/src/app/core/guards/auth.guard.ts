import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';
import { UserPreferencesService } from '../services/user-preferences.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private prefsService: UserPreferencesService,
    private router: Router,
  ) {}

  canActivate(): Observable<boolean> | boolean {
    if (!this.authService.isLoggedIn()) {
      this.permissionService.clear();
      this.prefsService.clear();
      this.router.navigate(['/auth/sign-in']);
      return false;
    }

    if (this.permissionService.loaded) {
      return true;
    }

    return this.permissionService.load().pipe(
      tap(() => {
        // Load preferences in parallel (fire & forget — don't block routing).
        this.prefsService.load().subscribe({ error: () => {} });
      }),
      map(() => true),
      catchError(() => {
        this.router.navigate(['/auth/sign-in']);
        return of(false);
      })
    );
  }
}
