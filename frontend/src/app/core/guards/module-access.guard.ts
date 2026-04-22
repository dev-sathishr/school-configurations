import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { ToastService } from '../../shared/services/toast/toast.service';
import { PermissionService } from '../services/permission.service';

@Injectable({ providedIn: 'root' })
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private permissionService: PermissionService,
    private toastService: ToastService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const single = route.data['moduleCode'] as string | undefined;
    const many = route.data['moduleCodes'] as string[] | undefined;
    const moduleCodes = many?.length ? many : (single ? [single] : []);

    if (moduleCodes.length === 0) return true;

    const hasAccess = moduleCodes.some((code) => this.permissionService.hasAnyPermission(code));
    if (hasAccess) return true;

    this.toastService.error('You do not have access to this module');
    return this.router.createUrlTree(['/errors/403'], {
      queryParams: {
        reason: 'module-access',
        from: state.url,
      },
    });
  }
}
