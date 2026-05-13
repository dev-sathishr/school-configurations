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
    const many = route.data['moduleCodes'] as string[] | undefined;
    const explicit = route.data['moduleCode'] as string | undefined;

    let moduleCodes: string[];

    if (many?.length) {
      moduleCodes = many;
    } else if (explicit) {
      moduleCodes = [explicit.toUpperCase()];
    } else {
      // No explicit code — resolve by matching the current URL path against
      // permitted module route_paths (e.g. /engine/meta → ENGINE_META).
      // This handles dynamic :menu/:slug routes where the slug alone ('meta')
      // would not score high enough against a compound code ('ENGINE_META').
      const urlPath = state.url.split('?')[0];
      const matched = this.resolveModuleCodeByUrl(urlPath);
      moduleCodes = matched ? [matched] : [];
    }

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

  /** Find the module whose route_path is a prefix of (or equal to) the current URL. */
  private resolveModuleCodeByUrl(urlPath: string): string | null {
    const allModules = this.permissionService.getAllModules();
    // Prefer longer (more specific) matches first
    const sorted = allModules
      .filter(m => m.route_path && urlPath.startsWith(m.route_path))
      .sort((a, b) => b.route_path.length - a.route_path.length);
    return sorted[0]?.code ?? null;
  }
}
