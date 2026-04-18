import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { PermissionService } from '../../../../../core/services/permission.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';

interface ModuleItem {
  id: string;
  name: string;
  code?: string;
  selected: boolean;
  display_order: number;
}

@Component({
  selector: 'app-menu-form',
  templateUrl: './menu-form.component.html',
  imports: [ReactiveFormsModule, FormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent],
})
export class MenuFormComponent implements OnInit {
  form!: FormGroup;
  editMode = false;
  viewMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';
  parentLabel = '';

  allModules: ModuleItem[] = [];
  modulesLoading = false;

  constructor(private cs: CommonService, private fb: FormBuilder, private route: ActivatedRoute, private cdr: ChangeDetectorRef, public ps: PermissionService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
      icon: [''],
      route_path: [''],
      display_order: [0],
      is_active: [true],
      description: [''],
      parent_id: [''],
    });

    this.modulesLoading = true;
    this.cs.getService({ url: '/modules/dropdown' }).subscribe({
      next: (res: any) => {
        const items = res.data || res || [];
        this.allModules = items.map((m: any) => ({ id: m.id, name: m.name, code: m.code, selected: false, display_order: 0 }));
        this.modulesLoading = false;
        this.loadEditData();
      },
      error: () => { this.modulesLoading = false; this.cdr.detectChanges(); },
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
      this.cs.getService({ url: `/menus/${id}` }).subscribe({
        next: (res: any) => {
          const menu = res.menu || res.data || res;
          this.form.patchValue(menu);
          this.parentLabel = menu.parent_name || '';

          if (menu.modules && Array.isArray(menu.modules)) {
            for (const assigned of menu.modules) {
              const mod = this.allModules.find(m => m.id === assigned.module_id);
              if (mod) {
                mod.selected = true;
                mod.display_order = assigned.display_order || 0;
              }
            }
          }

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => { this.loading = false; this.cdr.detectChanges(); this.cs.navigate({ url: '/settings/menu' }); },
      });
    } else {
      this.cdr.detectChanges();
    }
  }

  get f() { return this.form.controls; }

  get selectedModules(): ModuleItem[] {
    return this.allModules.filter(m => m.selected);
  }

  toggleModule(mod: ModuleItem) {
    mod.selected = !mod.selected;
    if (!mod.selected) mod.display_order = 0;
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) return;

    this.saving = true;
    const data: any = { ...this.form.value };
    if (!data.parent_id) delete data.parent_id;

    data.modules = this.allModules
      .filter(m => m.selected)
      .map(m => ({ module_id: m.id, display_order: m.display_order || 0 }));

    const req = this.editMode
      ? this.cs.putService({ url: `/menus/${this.editId}`, payload: data })
      : this.cs.postService({ url: '/menus', payload: data });

    req.subscribe({
      next: () => { this.saving = false; this.cs.navigate({ url: '/settings/menu' }); },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Something went wrong'; },
    });
  }

  cancel() { this.cs.navigate({ url: '/settings/menu' }); }

  switchToEdit() { this.cs.navigate({ url: `/settings/menu/${this.editId}/edit` }); }
}
