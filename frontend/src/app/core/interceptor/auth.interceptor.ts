import { Injectable, Injector } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';
import { ToastService } from '../../shared/services/toast/toast.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private permissionService?: PermissionService;
  private handlingForbidden = false;

  constructor(private authService: AuthService, private injector: Injector, private toastService: ToastService) {}

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
          const isAuthEndpoint = req.url.includes('/auth/logout') || req.url.includes('/auth/login');
          if (!isAuthEndpoint) {
            this.authService.logout();
          }
        }

        if (error.status === 403) {
          const message = error.error?.message || 'You do not have permission to perform this action';
          if (!this.handlingForbidden) {
            this.handlingForbidden = true;
            this.toastService.error(message);
            // Refresh permission cache in background, then go back to the
            // previous route instead of forcing first-menu/dashboard redirect.
            const ps = this.getPermissionService();
            ps.load().subscribe({
              next: () => {
                window.history.back();
                this.handlingForbidden = false;
              },
              error: () => {
                window.history.back();
                this.handlingForbidden = false;
              },
            });
          }
        }

        return throwError(() => error);
      })
    );
  }
}
