import { Component, OnInit } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import { API } from '../../../../../core/api/endpoints';

interface ModuleItem {
  id: string;
  name: string;
  display_name?: string;
  selected: boolean;
  display_order: number;
}

@Component({
  selector: 'app-menu-form',
  templateUrl: './menu-form.component.html',
  imports: [ReactiveFormsModule, FormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent],
})
export class MenuFormComponent extends FormPageBase implements OnInit {
  listRoute = '/settings/menu';
  resourcePath = API.menus.base;

  parentLabel = '';
  allModules: ModuleItem[] = [];
  modulesLoading = false;

  protected buildForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      display_name: ['', Validators.required],
      icon: [''],
      route_path: [''],
      display_order: [0],
      is_active: [true],
      description: [''],
      parent_id: [''],
    });
  }

  // Modules dropdown must be resolved before we can mark which ones are
  // already attached in edit mode. Chain the record fetch after it lands.
  override ngOnInit(): void {
    this.form = this.buildForm();
    this.modulesLoading = true;
    this.cs.getService({ url: API.modules.dropdown, params: { page: 1, size: 1000 } }).subscribe({
      next: (res: any) => {
        const items = res.data || res || [];
        this.allModules = items.map((m: any) => ({ id: m.id, name: m.name, display_name: m.display_name, selected: false, display_order: 0 }));
        this.modulesLoading = false;
        this.detectModeAndLoad();
      },
      error: () => { this.modulesLoading = false; this.cdr.detectChanges(); },
    });
  }

  protected override onRecordLoaded(menu: any): void {
    this.form.patchValue({
      ...menu,
      parent_id: menu.parent?.id || '',
    });
    this.parentLabel = menu.parent?.name || '';

    if (Array.isArray(menu.modules)) {
      for (const assigned of menu.modules) {
        const mod = this.allModules.find(m => m.id === assigned.module_id);
        if (mod) {
          mod.selected = true;
          mod.display_order = assigned.display_order || 0;
        } else {
          // Keep already-mapped modules in the payload even if they were not
          // returned by dropdown (pagination/filtering/inactive edge cases).
          this.allModules.push({
            id: assigned.module_id,
            name: assigned.module_name || assigned.module_code || 'Unknown Module',
            display_name: assigned.module_code,
            selected: true,
            display_order: assigned.display_order || 0,
          });
        }
      }
    }
  }

  protected override toPayload(): any {
    const data: any = { ...this.form.value };
    if (!data.parent_id) delete data.parent_id;
    data.modules = this.allModules
      .filter(m => m.selected)
      .map(m => ({ module_id: m.id, display_order: m.display_order || 0 }));
    return data;
  }

  get selectedModules(): ModuleItem[] {
    return this.allModules.filter(m => m.selected);
  }

  toggleModule(mod: ModuleItem): void {
    mod.selected = !mod.selected;
    if (!mod.selected) mod.display_order = 0;
  }

  protected override afterSave(res: any): void {
    this.cs.showToastr({ type: 'success', message: res?.message || 'Saved successfully' });
    super.afterSave(res);
  }
}
