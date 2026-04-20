import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { CommonService } from '../../shared/services/common/common.service';
import { API } from '../api/endpoints';

export interface ModulePermissions {
  id: string;
  name: string;
  code: string;
  icon: string;
  route_path: string;
  display_order: number;
  permissions: Record<string, boolean>;
}

export interface PermittedMenu {
  id: string;
  name: string;
  code: string;
  icon: string;
  route_path: string;
  display_order: number;
  modules: ModulePermissions[];
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  // Signal-based source of truth; observable facade for legacy subscribers
  // (menu.service, navbar). New code should read the signal directly.
  private readonly _menus = signal<PermittedMenu[]>([]);
  readonly menus$ = toObservable(this._menus);

  private _loaded = false;

  /** Synchronous snapshot — reads the signal. */
  get menus(): PermittedMenu[] {
    return this._menus();
  }

  get loaded(): boolean {
    return this._loaded;
  }

  constructor(private cs: CommonService) {}

  load(): Observable<any> {
    return this.cs.getService({ url: API.auth.myPermissions }).pipe(
      tap((res: any) => {
        const menus = res.menus || [];
        this._menus.set(menus);
        this._loaded = true;
      })
    );
  }

  clear(): void {
    this._menus.set([]);
    this._loaded = false;
  }

  hasMenuAccess(menuCode: string): boolean {
    return this._menus().some((m) => m.code === menuCode);
  }

  hasModulePermission(moduleCode: string, permission: string): boolean {
    for (const menu of this._menus()) {
      const mod = menu.modules.find((m) => m.code === moduleCode);
      if (mod) return !!mod.permissions[permission.toLowerCase()];
    }
    return false;
  }

  hasAnyPermission(moduleCode: string): boolean {
    for (const menu of this._menus()) {
      const mod = menu.modules.find((m) => m.code === moduleCode);
      if (mod) return Object.values(mod.permissions).some((v) => v);
    }
    return false;
  }

  canView(moduleCode: string): boolean {
    return this.hasModulePermission(moduleCode, 'view');
  }

  canCreate(moduleCode: string): boolean {
    return this.hasModulePermission(moduleCode, 'create');
  }

  canEdit(moduleCode: string): boolean {
    return this.hasModulePermission(moduleCode, 'edit');
  }

  canDelete(moduleCode: string): boolean {
    return this.hasModulePermission(moduleCode, 'delete');
  }

  canImport(moduleCode: string): boolean {
    return this.hasModulePermission(moduleCode, 'import');
  }

  canExport(moduleCode: string): boolean {
    return this.hasModulePermission(moduleCode, 'export');
  }

  getModulePermissions(moduleCode: string): Record<string, boolean> | null {
    for (const menu of this._menus()) {
      const mod = menu.modules.find((m) => m.code === moduleCode);
      if (mod) return mod.permissions;
    }
    return null;
  }

  getAllModules(): ModulePermissions[] {
    return this._menus().flatMap((m) => m.modules);
  }
}
