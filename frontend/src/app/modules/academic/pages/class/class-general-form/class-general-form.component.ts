import { Component } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import { API } from '../../../../../core/api/endpoints';
import { ACADEMIC_LEVEL_OPTIONS } from '../../../../../core/constants/enums';
import * as V from '../../../../../shared/validators/common';

@Component({
  selector: 'app-class-general-form',
  templateUrl: './class-general-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent],
})
export class ClassGeneralFormComponent extends FormPageBase {
  listRoute = '/academic/class';
  resourcePath = API.classes.base;

  academicLevelOptions = ACADEMIC_LEVEL_OPTIONS;

  protected buildForm(): FormGroup {
    return this.fb.group({
      name: ['', V.LONG_NAME],
      code: ['', V.maxLength(50)],
      strength: [0],
      academic_level: ['primary', Validators.required],
      is_active: [true],
      notes: ['', V.NOTES],
    });
  }

  // On create, jump into the levels tab of the new class so the user can
  // immediately start adding sections. On edit, fall back to the list.
  protected override afterSave(res: any): void {
    this.saving = false;
    const createdId = res?.data?.id;
    this.cs.showToastr({
      type: 'success',
      message: this.editMode ? 'Class updated' : 'Class created',
      description: this.editMode ? 'Changes saved successfully' : 'New class has been added',
    });
    if (!this.editMode && createdId) {
      this.cs.navigate({ url: `${this.listRoute}/${createdId}/edit`, queryParams: { tab: 'levels' } });
    } else {
      this.cs.navigate({ url: this.listRoute });
    }
  }
}
