import { Component } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import { API } from '../../../../../core/api/endpoints';

@Component({
  selector: 'app-permission-form',
  templateUrl: './permission-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent],
})
export class PermissionFormComponent extends FormPageBase {
  listRoute = '/settings/permission';
  resourcePath = API.permissions.base;

  protected buildForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
      description: [''],
      is_active: [true],
    });
  }

  protected override afterSave(res: any): void {
    this.cs.showToastr({ type: 'success', message: res?.message || 'Saved successfully' });
    super.afterSave(res);
  }
}
