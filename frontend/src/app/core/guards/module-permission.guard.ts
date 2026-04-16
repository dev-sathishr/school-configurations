import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { ToastService } from '../../shared/services/toast/toast.service';

@Injectable({ providedIn: 'root' })
export class ModulePermissionGuard implements CanActivate {
  constructor(private permissionService: PermissionService, private router: Router, private toastService: ToastService) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const moduleCode = route.data['moduleCode'] as string;
    const permission = route.data['permission'] as string;

    if (!moduleCode || !permission) return true;

    if (this.permissionService.hasModulePermission(moduleCode, permission)) {
      return true;
    }

    this.toastService.error('You do not have permission to access this page');

    // Navigate back to the module's list page or first available menu
    const menus = this.permissionService.menus;
    if (menus.length > 0 && menus[0].route_path) {
      this.router.navigate([menus[0].route_path]);
    } else {
      this.router.navigate(['/no-access']);
    }
    return false;
  }
}
