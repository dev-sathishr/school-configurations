import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';

@Injectable({ providedIn: 'root' })
export class DefaultRedirectGuard implements CanActivate {
  constructor(private permissionService: PermissionService, private router: Router) {}

  canActivate(): boolean {
    const menus = this.permissionService.menus;

    if (menus.length > 0 && menus[0].route_path) {
      this.router.navigate([menus[0].route_path]);
    } else {
      this.router.navigate(['/no-access']);
    }

    return false;
  }
}
