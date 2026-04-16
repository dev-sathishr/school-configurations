import { Injectable, Injector } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';
import { ToastService } from '../../shared/services/toast/toast.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private permissionService?: PermissionService;

  constructor(private authService: AuthService, private injector: Injector, private router: Router, private toastService: ToastService) {}

  private getPermissionService(): PermissionService {
    if (!this.permissionService) {
      this.permissionService = this.injector.get(PermissionService);
    }
    return this.permissionService;
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.authService.logout();
        }

        if (error.status === 403) {
          const message = error.error?.message || 'You do not have permission to perform this action';
          this.toastService.error(message);

          // Re-fetch permissions and redirect
          const ps = this.getPermissionService();
          ps.load().subscribe(() => {
            const menus = ps.menus;
            if (menus.length > 0 && menus[0].route_path) {
              this.router.navigate([menus[0].route_path]);
            } else {
              this.router.navigate(['/no-access']);
            }
          });
        }

        return throwError(() => error);
      })
    );
  }
}
