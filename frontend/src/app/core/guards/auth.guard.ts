import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';
import { UserPreferencesService } from '../services/user-preferences.service';
import { LocationContextService } from '../services/location-context.service';
import { SessionTrackingService } from '../services/session-tracking.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private prefsService: UserPreferencesService,
    private locationContext: LocationContextService,
    sessionTracking: SessionTrackingService,
    private router: Router,
  ) {
    // AuthGuard is a `providedIn: 'root'` singleton — instantiating the
    // tracker here kicks off its Router subscription once per app boot,
    // the moment any route guard runs (which is before any authed route
    // renders). No further wiring needed elsewhere.
    sessionTracking.start();
  }

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
        // Token was present but the backend won't hydrate (401/404/backend
        // down). Drop the stored session so the next page load doesn't retry
        // the same doomed forkJoin — otherwise the user is stuck in a
        // sign-in → bootstrap-error → sign-in loop with errors in console.
        this.authService.dropStoredSession();
        this.permissionService.clear();
        this.locationContext.clear();
        this.router.navigate(['/auth/sign-in']);
        return of(false);
      })
    );
  }
}
