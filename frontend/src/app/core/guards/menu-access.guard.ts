import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { ToastService } from '../../shared/services/toast/toast.service';
import { PermissionService } from '../services/permission.service';

@Injectable({ providedIn: 'root' })
export class MenuAccessGuard implements CanActivate {
  constructor(
    private permissionService: PermissionService,
    private router: Router,
    private toastService: ToastService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    // Prefer an explicit menuCode in route data; fall back to resolving by URL segment.
    const menuCode = (route.data['menuCode'] as string) || this.resolveMenuCodeFromUrl(route);
    if (!menuCode) return true; // unknown segment — let child guards decide

    if (this.permissionService.hasMenuAccess(menuCode)) {
      return true;
    }

    this.toastService.error('You do not have access to this module');
    return this.router.createUrlTree(['/errors/403'], {
      queryParams: {
        reason: 'menu-access',
        from: state.url,
      },
    });
  }

  /** Match the first URL segment against permitted menu route_paths. */
  private resolveMenuCodeFromUrl(route: ActivatedRouteSnapshot): string | null {
    const segment = route.paramMap.get('menu') ?? route.url[0]?.path ?? '';
    if (!segment) return null;

    const match = this.permissionService.menus.find((m) => {
      const tail = (m.route_path ?? '').split('/').filter(Boolean).pop() ?? '';
      return tail.toLowerCase() === segment.toLowerCase();
    });

    return match?.code ?? null;
  }
}
