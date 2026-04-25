import { Component } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import { API } from '../../../../../core/api/endpoints';

@Component({
  selector: 'app-group-module-form',
  templateUrl: './group-module-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent],
})
export class GroupModuleFormComponent extends FormPageBase {
  listRoute = '/settings/group-module';
  resourcePath = API.groupModules.base;

  groupLabel = '';
  menuLabel = '';

  protected buildForm(): FormGroup {
    return this.fb.group({
      group_id: ['', Validators.required],
      menu_id: ['', Validators.required],
    });
  }

  protected override onRecordLoaded(data: any): void {
    this.form.patchValue({
      group_id: data.group?.id || '',
      menu_id: data.menu?.id || '',
    });
    this.groupLabel = data.group?.name || '';
    this.menuLabel = data.menu?.name || '';
  }

  protected override afterSave(res: any): void {
    this.cs.showToastr({ type: 'success', message: res?.message || 'Saved successfully' });
    super.afterSave(res);
  }
}
