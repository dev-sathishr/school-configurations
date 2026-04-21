import { Component } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import { API } from '../../../../../core/api/endpoints';

interface PermissionType {
  id: string;
  name: string;
  code: string;
}

interface ModulePermission {
  module_id: string;
  module_name: string;
  module_code: string;
  permissions: Record<string, boolean>;
}

interface MenuTree {
  id: string;
  name: string;
  code: string;
  icon: string;
  selected: boolean;
  modules: ModulePermission[];
}

@Component({
  selector: 'app-group-form',
  templateUrl: './group-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent],
})
export class GroupFormComponent extends FormPageBase {
  listRoute = '/settings/group';
  resourcePath = API.groups.base;

  permissionTypes: PermissionType[] = [];
  menuTree: MenuTree[] = [];
  matrixLoading = false;

  protected buildForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
      description: [''],
      is_active: [true],
    });
  }

  // The menu × permission matrix has to exist before we can mark what's
  // enabled on the record, so load those two endpoints first and only then
  // fetch the record.
  override ngOnInit(): void {
    this.form = this.buildForm();
    const recordId = this.cs.getRouteParam(this.route, 'id');
    // For edit/view, start in loading mode so we don't flip false -> true
    // during the first check cycle (avoids NG0100 in dev mode).
    this.loading = !!recordId;
    this.matrixLoading = true;
    forkJoin({
      menus: this.cs.getService({ url: API.menus.withModules }),
      permissions: this.cs.getService({ url: API.permissions.dropdown }),
    }).subscribe({
      next: (res: any) => {
        this.permissionTypes = (res.permissions.data || res.permissions || [])
          .map((p: any) => ({ id: p.id, name: p.name, code: p.code }));

        const menus = res.menus.data || res.menus || [];
        this.menuTree = menus.map((m: any) => ({
          id: m.id,
          name: m.name,
          code: m.code,
          icon: m.icon,
          selected: false,
          modules: (m.modules || []).map((mod: any) => {
            const perms: Record<string, boolean> = {};
            for (const pt of this.permissionTypes) { perms[pt.id] = false; }
            return {
              module_id: mod.id,
              module_name: mod.name,
              module_code: mod.code,
              permissions: perms,
            };
          }),
        }));

        this.matrixLoading = false;
        if (recordId) {
          // Defer to the next microtask to keep current-cycle bindings stable.
          queueMicrotask(() => this.detectModeAndLoad());
        } else {
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.matrixLoading = false;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  protected override onRecordLoaded(group: any): void {
    this.form.patchValue(group);

    const menuIdSet = new Set<string>(group.menu_ids || []);
    for (const menu of this.menuTree) {
      menu.selected = menuIdSet.has(menu.id);
    }

    if (Array.isArray(group.permissions)) {
      for (const gp of group.permissions) {
        for (const menu of this.menuTree) {
          const mod = menu.modules.find(m => m.module_id === gp.module_id);
          if (mod && mod.permissions[gp.permission_id] !== undefined) {
            mod.permissions[gp.permission_id] = true;
          }
        }
      }
    }
  }

  protected override toPayload(): any {
    const data: any = { ...this.form.value };
    data.menu_ids = this.menuTree.filter(m => m.selected).map(m => m.id);
    data.permissions = [];
    for (const menu of this.menuTree) {
      for (const mod of menu.modules) {
        for (const [permId, checked] of Object.entries(mod.permissions)) {
          if (checked) {
            data.permissions.push({ module_id: mod.module_id, permission_id: permId });
          }
        }
      }
    }
    return data;
  }

  toggleMenu(menu: MenuTree): void {
    menu.selected = !menu.selected;
    if (!menu.selected) {
      for (const mod of menu.modules) {
        for (const ptId of Object.keys(mod.permissions)) {
          mod.permissions[ptId] = false;
        }
      }
    }
  }

  onPermissionChange(menu: MenuTree): void {
    const hasAny = menu.modules.some(m => Object.values(m.permissions).some(v => v));
    if (hasAny && !menu.selected) {
      menu.selected = true;
    }
  }

  toggleAllForModule(mod: ModulePermission, menu: MenuTree): void {
    const allChecked = this.isAllCheckedForModule(mod);
    for (const ptId of Object.keys(mod.permissions)) {
      mod.permissions[ptId] = !allChecked;
    }
    this.onPermissionChange(menu);
  }

  isAllCheckedForModule(mod: ModulePermission): boolean {
    const vals = Object.values(mod.permissions);
    return vals.length > 0 && vals.every(v => v);
  }

  isSomeCheckedForModule(mod: ModulePermission): boolean {
    const vals = Object.values(mod.permissions);
    const count = vals.filter(Boolean).length;
    return count > 0 && count < vals.length;
  }
}
