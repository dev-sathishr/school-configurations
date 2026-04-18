import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { PermissionService } from '../../../../../core/services/permission.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';

interface PermissionType {
  id: string;
  name: string;
  code: string;
}

interface ModulePermission {
  module_id: string;
  module_name: string;
  module_code: string;
  permissions: Record<string, boolean>; // permission_id -> checked
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
export class GroupFormComponent implements OnInit {
  form!: FormGroup;
  editMode = false;
  viewMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';

  permissionTypes: PermissionType[] = [];
  menuTree: MenuTree[] = [];
  matrixLoading = false;

  constructor(private cs: CommonService, private fb: FormBuilder, private route: ActivatedRoute, private cdr: ChangeDetectorRef, public ps: PermissionService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
      description: [''],
      is_active: [true],
    });

    this.matrixLoading = true;
    forkJoin({
      menus: this.cs.getService({ url: '/menus/with-modules' }),
      permissions: this.cs.getService({ url: '/permissions/dropdown' }),
    }).subscribe({
      next: (res: any) => {
        this.permissionTypes = (res.permissions.data || res.permissions || []).map((p: any) => ({ id: p.id, name: p.name, code: p.code }));

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
        this.loadEditData();
      },
      error: () => { this.matrixLoading = false; this.cdr.detectChanges(); },
    });
  }

  private loadEditData() {
    const id = this.cs.getRouteParam(this.route, 'id');
    if (id) {
      const segments = this.route.snapshot.url;
      const lastPath = segments[segments.length - 1]?.path;
      this.viewMode = lastPath === 'view';
      this.editMode = !this.viewMode;
      this.editId = id;
      this.loading = true;
      this.cs.getService({ url: `/groups/${id}` }).subscribe({
        next: (res: any) => {
          const group = res.group || res.data || res;
          this.form.patchValue(group);

          const menuIdSet = new Set<string>(group.menu_ids || []);
          for (const menu of this.menuTree) {
            menu.selected = menuIdSet.has(menu.id);
          }

          if (group.permissions && Array.isArray(group.permissions)) {
            for (const gp of group.permissions) {
              for (const menu of this.menuTree) {
                const mod = menu.modules.find(m => m.module_id === gp.module_id);
                if (mod && mod.permissions[gp.permission_id] !== undefined) {
                  mod.permissions[gp.permission_id] = true;
                }
              }
            }
          }

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => { this.loading = false; this.cdr.detectChanges(); this.cs.navigate({ url: '/settings/group' }); },
      });
    } else {
      this.cdr.detectChanges();
    }
  }

  get f() { return this.form.controls; }

  toggleMenu(menu: MenuTree) {
    menu.selected = !menu.selected;
    if (!menu.selected) {
      for (const mod of menu.modules) {
        for (const ptId of Object.keys(mod.permissions)) {
          mod.permissions[ptId] = false;
        }
      }
    }
  }

  onPermissionChange(menu: MenuTree) {
    const hasAny = menu.modules.some(m => Object.values(m.permissions).some(v => v));
    if (hasAny && !menu.selected) {
      menu.selected = true;
    }
  }

  toggleAllForModule(mod: ModulePermission, menu: MenuTree) {
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

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) return;

    this.saving = true;
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

    const req = this.editMode
      ? this.cs.putService({ url: `/groups/${this.editId}`, payload: data })
      : this.cs.postService({ url: '/groups', payload: data });

    req.subscribe({
      next: () => { this.saving = false; this.cs.navigate({ url: '/settings/group' }); },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Something went wrong'; },
    });
  }

  cancel() { this.cs.navigate({ url: '/settings/group' }); }

  switchToEdit() { this.cs.navigate({ url: `/settings/group/${this.editId}/edit` }); }
}
