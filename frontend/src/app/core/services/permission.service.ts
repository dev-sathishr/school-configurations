import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { CommonService } from '../../shared/services/common/common.service';

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
  private _menus = new BehaviorSubject<PermittedMenu[]>([]);
  private _loaded = false;

  menus$ = this._menus.asObservable();

  get menus(): PermittedMenu[] {
    return this._menus.value;
  }

  get loaded(): boolean {
    return this._loaded;
  }

  constructor(private cs: CommonService) {}

  load(): Observable<any> {
    return this.cs.getService({ url: '/auth/me/permissions' }).pipe(
      tap((res: any) => {
        const menus = res.menus || [];
        this._menus.next(menus);
        this._loaded = true;
      })
    );
  }

  clear(): void {
    this._menus.next([]);
    this._loaded = false;
  }

  hasMenuAccess(menuCode: string): boolean {
    return this._menus.value.some((m) => m.code === menuCode);
  }

  hasModulePermission(moduleCode: string, permission: string): boolean {
    for (const menu of this._menus.value) {
      const mod = menu.modules.find((m) => m.code === moduleCode);
      if (mod) return !!mod.permissions[permission.toLowerCase()];
    }
    return false;
  }

  hasAnyPermission(moduleCode: string): boolean {
    for (const menu of this._menus.value) {
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

  getModulePermissions(moduleCode: string): Record<string, boolean> | null {
    for (const menu of this._menus.value) {
      const mod = menu.modules.find((m) => m.code === moduleCode);
      if (mod) return mod.permissions;
    }
    return null;
  }

  getAllModules(): ModulePermissions[] {
    return this._menus.value.flatMap((m) => m.modules);
  }
}
