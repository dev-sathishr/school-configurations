import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';

@Injectable({ providedIn: 'root' })
export class MenuAccessGuard implements CanActivate {
  constructor(private permissionService: PermissionService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const menuCode = route.data['menuCode'] as string;
    if (!menuCode) return true;

    if (this.permissionService.hasMenuAccess(menuCode)) {
      return true;
    }

    // Redirect to first available menu or no-access
    const menus = this.permissionService.menus;
    if (menus.length > 0 && menus[0].route_path) {
      this.router.navigate([menus[0].route_path]);
    } else {
      this.router.navigate(['/no-access']);
    }
    return false;
  }
}
