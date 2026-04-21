import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { ToastService } from '../../shared/services/toast/toast.service';

@Injectable({ providedIn: 'root' })
export class ModulePermissionGuard implements CanActivate {
  constructor(private permissionService: PermissionService, private toastService: ToastService) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const moduleCode = route.data['moduleCode'] as string;
    const permission = route.data['permission'] as string;

    if (!moduleCode || !permission) return true;

    if (this.permissionService.hasModulePermission(moduleCode, permission)) {
      return true;
    }

    this.toastService.error('You do not have permission to access this page');
    window.history.back();
    return false;
  }
}
