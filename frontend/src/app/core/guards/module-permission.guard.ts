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
    const permission = route.data['permission'] as string;
    if (!permission) return true;

    const moduleCode = this.resolveModuleCode(route, state);
    if (!moduleCode) return true;

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

  private resolveModuleCode(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): string | null {
    if (route.data['moduleCode']) return (route.data['moduleCode'] as string).toUpperCase();

    // Match the URL against permitted module route_paths — avoids the slug
    // alone (e.g. 'meta') failing to score against a compound code ('ENGINE_META').
    const urlPath = state.url.split('?')[0];
    const allModules = this.permissionService.getAllModules();
    const sorted = allModules
      .filter(m => m.route_path && urlPath.startsWith(m.route_path))
      .sort((a, b) => b.route_path.length - a.route_path.length);
    return sorted[0]?.code ?? null;
  }
}
