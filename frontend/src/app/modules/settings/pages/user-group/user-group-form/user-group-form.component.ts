import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { NgClass } from '@angular/common';

interface Permission {
  module_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface Module {
  id: string;
  name: string;
  menu_id: string;
  menu_name: string;
}

interface MenuGroup {
  menu_id: string;
  menu_name: string;
  modules: Module[];
  collapsed: boolean;
}

@Component({
  selector: 'app-user-group-form',
  templateUrl: './user-group-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent, NgClass],
})
export class UserGroupFormComponent implements OnInit {
  form!: FormGroup;
  editMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';

  menuGroups: MenuGroup[] = [];
  permissions: Record<string, Permission> = {};
  permissionsLoaded = false;

  constructor(private cs: CommonService, private fb: FormBuilder, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]],
      is_active: [true],
    });

    const id = this.cs.getRouteParam(this.route, 'id');
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.loading = true;
      this.cs.getService({ url: `/user-groups/${id}` }).subscribe({
        next: (res: any) => {
          const d = res.data;
          this.form.patchValue(d);
          this.loading = false;
          this.loadModules();
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
          this.cs.navigate({ url: '/settings/user-group' });
        },
      });
    } else {
      this.loadModules();
    }
  }

  get f() { return this.form.controls; }

  private loadModules(): void {
    this.cs.getService({ url: '/modules', params: { page: 1, size: 100 } }).subscribe({
      next: (res: any) => {
        const modules: Module[] = (res.data?.content || res.data || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          menu_id: m.menu_id,
          menu_name: m.menu_name,
        }));

        // Group modules by menu
        const groupMap: Record<string, MenuGroup> = {};
        for (const mod of modules) {
          if (!groupMap[mod.menu_id]) {
            groupMap[mod.menu_id] = { menu_id: mod.menu_id, menu_name: mod.menu_name, modules: [], collapsed: false };
          }
          groupMap[mod.menu_id].modules.push(mod);

          // Initialize default permission
          if (!this.permissions[mod.id]) {
            this.permissions[mod.id] = { module_id: mod.id, can_view: false, can_create: false, can_edit: false, can_delete: false };
          }
        }
        this.menuGroups = Object.values(groupMap);

        // Load existing permissions in edit mode
        if (this.editMode) {
          this.loadPermissions();
        } else {
          this.permissionsLoaded = true;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.cs.showToastr({ type: 'error', message: 'Failed to load modules' });
      },
    });
  }

  private loadPermissions(): void {
    this.cs.getService({ url: `/user-groups/${this.editId}/permissions` }).subscribe({
      next: (res: any) => {
        const perms: any[] = res.data || [];
        for (const p of perms) {
          this.permissions[p.module_id] = {
            module_id: p.module_id,
            can_view: !!p.can_view,
            can_create: !!p.can_create,
            can_edit: !!p.can_edit,
            can_delete: !!p.can_delete,
          };
        }
        this.permissionsLoaded = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.permissionsLoaded = true;
        this.cdr.detectChanges();
      },
    });
  }

  togglePermission(moduleId: string, field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete'): void {
    this.permissions[moduleId][field] = !this.permissions[moduleId][field];
  }

  isAllChecked(moduleId: string): boolean {
    const p = this.permissions[moduleId];
    return p.can_view && p.can_create && p.can_edit && p.can_delete;
  }

  toggleAll(moduleId: string): void {
    const allChecked = this.isAllChecked(moduleId);
    this.permissions[moduleId].can_view = !allChecked;
    this.permissions[moduleId].can_create = !allChecked;
    this.permissions[moduleId].can_edit = !allChecked;
    this.permissions[moduleId].can_delete = !allChecked;
  }

  isMenuAllChecked(group: MenuGroup): boolean {
    return group.modules.every(m => this.isAllChecked(m.id));
  }

  isMenuPartiallyChecked(group: MenuGroup): boolean {
    const hasAny = group.modules.some(m => {
      const p = this.permissions[m.id];
      return p.can_view || p.can_create || p.can_edit || p.can_delete;
    });
    return hasAny && !this.isMenuAllChecked(group);
  }

  toggleMenuAll(group: MenuGroup): void {
    const allChecked = this.isMenuAllChecked(group);
    for (const mod of group.modules) {
      this.permissions[mod.id].can_view = !allChecked;
      this.permissions[mod.id].can_create = !allChecked;
      this.permissions[mod.id].can_edit = !allChecked;
      this.permissions[mod.id].can_delete = !allChecked;
    }
  }

  toggleGroup(group: MenuGroup): void {
    group.collapsed = !group.collapsed;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.form.invalid) {
      this.cs.showToastr({ type: 'error', message: 'Please fix the errors', description: 'Fill all required fields before submitting' });
      return;
    }

    this.saving = true;
    const data = { ...this.form.value };

    const req = this.editMode
      ? this.cs.putService({ url: `/user-groups/${this.editId}`, payload: data })
      : this.cs.postService({ url: '/user-groups', payload: data });

    req.subscribe({
      next: (res: any) => {
        const groupId = this.editMode ? this.editId : res.data?.id;

        if (groupId) {
          // Save permissions
          const permList = Object.values(this.permissions).filter(p =>
            p.can_view || p.can_create || p.can_edit || p.can_delete
          );
          this.cs.putService({ url: `/user-groups/${groupId}/permissions`, payload: permList }).subscribe({
            next: () => {
              this.saving = false;
              this.cs.showToastr({ type: 'success', message: this.editMode ? 'User group updated' : 'User group created', description: this.editMode ? 'Changes saved successfully' : 'New user group has been added' });
              this.cs.navigate({ url: '/settings/user-group' });
            },
            error: (err: any) => {
              this.saving = false;
              this.cs.showToastr({ type: 'warning', message: this.editMode ? 'User group updated' : 'User group created', description: 'But permissions could not be saved' });
              this.cs.navigate({ url: '/settings/user-group' });
            },
          });
        } else {
          this.saving = false;
          this.cs.showToastr({ type: 'success', message: this.editMode ? 'User group updated' : 'User group created' });
          this.cs.navigate({ url: '/settings/user-group' });
        }
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Something went wrong';
        this.cs.showToastr({ type: 'error', message: 'Failed to save', description: this.errorMessage });
      },
    });
  }

  cancel() { this.cs.navigate({ url: '/settings/user-group' }); }
}
