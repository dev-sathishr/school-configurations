import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate } from '@angular/router';
import { ToastService } from '../../shared/services/toast/toast.service';
import { PermissionService } from '../services/permission.service';

@Injectable({ providedIn: 'root' })
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private permissionService: PermissionService,
    private toastService: ToastService
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const single = route.data['moduleCode'] as string | undefined;
    const many = route.data['moduleCodes'] as string[] | undefined;
    const moduleCodes = many?.length ? many : (single ? [single] : []);

    if (moduleCodes.length === 0) return true;

    const hasAccess = moduleCodes.some((code) => this.permissionService.hasAnyPermission(code));
    if (hasAccess) return true;

    this.toastService.error('You do not have access to this module');
    window.history.back();
    return false;
  }
}
