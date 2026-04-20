import { Component } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import { API } from '../../../../../core/api/endpoints';

@Component({
  selector: 'app-menu-module-form',
  templateUrl: './menu-module-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent],
})
export class MenuModuleFormComponent extends FormPageBase {
  listRoute = '/settings/menu-module';
  resourcePath = API.menuModules.base;

  moduleLabel = '';
  menuLabel = '';

  protected buildForm(): FormGroup {
    return this.fb.group({
      module_id: ['', Validators.required],
      menu_id: ['', Validators.required],
      display_order: [0],
    });
  }

  protected override onRecordLoaded(data: any): void {
    this.form.patchValue(data);
    this.moduleLabel = data.module_name || '';
    this.menuLabel = data.menu_name || '';
  }
}
