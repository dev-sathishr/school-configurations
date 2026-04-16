import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private permissionService: PermissionService, private router: Router) {}

  canActivate(): Observable<boolean> | boolean {
    if (!this.authService.isLoggedIn()) {
      this.permissionService.clear();
      this.router.navigate(['/auth/sign-in']);
      return false;
    }

    if (this.permissionService.loaded) {
      return true;
    }

    return this.permissionService.load().pipe(
      map(() => true),
      catchError(() => {
        this.router.navigate(['/auth/sign-in']);
        return of(false);
      })
    );
  }
}
