import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';
import { UserPreferencesService } from '../services/user-preferences.service';
import { LocationContextService } from '../services/location-context.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private prefsService: UserPreferencesService,
    private locationContext: LocationContextService,
    private router: Router,
  ) {}

  canActivate(): Observable<boolean> | boolean {
    if (!this.authService.isLoggedIn()) {
      this.permissionService.clear();
      this.prefsService.clear();
      this.locationContext.clear();
      this.router.navigate(['/auth/sign-in']);
      return false;
    }

    if (this.permissionService.loaded) {
      return true;
    }

    // Block routing on permissions + locations — both must resolve before any
    // module mounts, otherwise a list would load with an empty location scope
    // and show either nothing or everything incorrectly. Preferences are
    // non-critical, so they stay fire-and-forget.
    return forkJoin({
      permissions: this.permissionService.load(),
      locations: this.locationContext.load(),
    }).pipe(
      tap(() => {
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
