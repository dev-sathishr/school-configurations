import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { CommonService } from '../../shared/services/common/common.service';
import { API } from '../api/endpoints';

export interface ModulePermissions {
  id: string;
  name: string;
  display_name?: string;
  code: string;
  icon: string;
  route_path: string;
  display_order: number;
  enforce_edit_lock?: boolean;
  description?: string | null;
  permissions: Record<string, boolean>;
}

export interface PermittedMenu {
  id: string;
  name: string;
  display_name?: string;
  code: string;
  icon: string;
  route_path: string;
  display_order: number;
  description?: string | null;
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
    return !!this.resolveMenu(menuCode);
  }

  hasModulePermission(moduleCode: string, permission: string): boolean {
    const mod = this.resolveModule(moduleCode);
    if (!mod) return false;
    const key = String(permission || '').toLowerCase();
    return !!mod.permissions[key];
  }

  hasAnyPermission(moduleCode: string): boolean {
    const mod = this.resolveModule(moduleCode);
    if (!mod) return false;
    return Object.values(mod.permissions).some((v) => v);
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

  isEditLockEnabled(moduleCode: string): boolean {
    const mod = this.resolveModule(moduleCode);
    return !!mod?.enforce_edit_lock;
  }

  getModulePermissions(moduleCode: string): Record<string, boolean> | null {
    return this.resolveModule(moduleCode)?.permissions || null;
  }

  getAllModules(): ModulePermissions[] {
    return this._menus().flatMap((m) => m.modules);
  }

  private resolveMenu(menuCode: string): PermittedMenu | null {
    const scored = this._menus()
      .map((menu) => ({ menu, score: this.scoreMenuMatch(menu, menuCode) }))
      .filter((x) => x.score >= 90)
      .sort((a, b) =>
        (b.score - a.score) ||
        ((Number(a.menu.display_order ?? 0) - Number(b.menu.display_order ?? 0)))
      );
    return scored[0]?.menu || null;
  }

  private resolveModule(moduleCode: string): ModulePermissions | null {
    const modules = this._menus().flatMap((m) => m.modules);
    const scored = modules
      .map((mod) => ({ mod, score: this.scoreModuleMatch(mod, moduleCode) }))
      .filter((x) => x.score >= 90)
      .sort((a, b) =>
        (b.score - a.score) ||
        ((Number(a.mod.display_order ?? 0) - Number(b.mod.display_order ?? 0)))
      );
    return scored[0]?.mod || null;
  }

  private scoreMenuMatch(menu: PermittedMenu, menuCode: string): number {
    if (this.isTokenMatch(menu.code, menuCode)) return 100;
    if (this.isTokenMatch(menu.display_name, menuCode)) return 95;
    if (this.isTokenMatch(menu.name, menuCode)) return 90;
    return this.lexicalScore({
      code: menu.code,
      display_name: menu.display_name,
      name: menu.name,
      route_path: menu.route_path,
    }, menuCode);
  }

  private scoreModuleMatch(mod: ModulePermissions, moduleCode: string): number {
    if (this.isTokenMatch(mod.code, moduleCode)) return 100;
    if (this.isTokenMatch(mod.display_name, moduleCode)) return 95;
    if (this.isTokenMatch(mod.name, moduleCode)) return 90;
    return this.lexicalScore({
      code: mod.code,
      display_name: mod.display_name,
      name: mod.name,
      route_path: mod.route_path,
    }, moduleCode);
  }

  private lexicalScore(
    row: { code?: string; display_name?: string; name?: string; route_path?: string },
    requestedCode: string
  ): number {
    const requested = this.words(requestedCode);
    if (requested.length === 0) return 0;

    const candidate = [
      ...this.words(row.code),
      ...this.words(row.display_name),
      ...this.words(row.name),
      ...this.routeWords(row.route_path),
    ];
    const overlaps = this.overlapCount(requested, candidate);
    if (overlaps === 0) return 0;

    const coverage = overlaps / requested.length;
    return 40 + Math.round(coverage * 40) + overlaps;
  }

  private words(value: string | undefined | null): string[] {
    return String(value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => this.singularizeToken(w));
  }

  private routeWords(routePath: string | undefined | null): string[] {
    const clean = String(routePath || '')
      .split('?')[0]
      .split('#')[0]
      .replace(/\/+$/, '');
    const segments = clean.split('/').filter(Boolean);
    const tail = segments[segments.length - 1] || '';
    return this.words(tail);
  }

  private overlapCount(sourceWords: string[], targetWords: string[]): number {
    const source = new Set(sourceWords);
    const target = new Set(targetWords);
    let count = 0;
    source.forEach((w) => {
      if (target.has(w)) count += 1;
    });
    return count;
  }

  private normalizeToken(value: string | undefined | null): string {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private singularizeToken(value: string | undefined | null): string {
    const t = this.normalizeToken(value);
    if (!t) return t;
    if (t.endsWith('IES') && t.length > 3) return `${t.slice(0, -3)}Y`;
    if (t.endsWith('SES') && t.length > 3) return t.slice(0, -2);
    if (t.endsWith('S') && !t.endsWith('SS') && t.length > 1) return t.slice(0, -1);
    return t;
  }

  private comparableToken(value: string | undefined | null): string {
    return this.singularizeToken(value);
  }

  private isTokenMatch(left: string | undefined | null, right: string | undefined | null): boolean {
    if (!left || !right) return false;
    return this.normalizeToken(left) === this.normalizeToken(right) ||
      this.comparableToken(left) === this.comparableToken(right);
  }
}
