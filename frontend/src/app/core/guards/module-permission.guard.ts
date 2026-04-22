import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { ToastService } from '../../shared/services/toast/toast.service';

@Injectable({ providedIn: 'root' })
export class ModulePermissionGuard implements CanActivate {
  constructor(
    private permissionService: PermissionService,
    private toastService: ToastService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const moduleCode = route.data['moduleCode'] as string;
    const permission = route.data['permission'] as string;

    if (!moduleCode || !permission) return true;

    if (this.permissionService.hasModulePermission(moduleCode, permission)) {
      return true;
    }

    this.toastService.error('You do not have permission to access this page');
    return this.router.createUrlTree(['/errors/403'], {
      queryParams: {
        reason: 'permission',
        from: state.url,
      },
    });
  }
}
