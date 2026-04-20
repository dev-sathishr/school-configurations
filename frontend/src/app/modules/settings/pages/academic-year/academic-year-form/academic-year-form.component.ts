import { Component, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LocationFieldComponent } from '../../../../../shared/components/location-field/location-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import { LocationContextService } from '../../../../../core/services/location-context.service';
import * as V from '../../../../../shared/validators/common';

@Component({
  selector: 'app-academic-year-form',
  templateUrl: './academic-year-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LocationFieldComponent, LoaderComponent, BreadcrumbComponent],
})
export class AcademicYearFormComponent extends FormPageBase {
  listRoute = '/settings/academic-year';
  resourcePath = '/academic-years';

  private readonly locationCtx = inject(LocationContextService);

  // Edit-mode location pass-through so `<app-location-field>` keeps the
  // existing value visible even if not currently in the header selection.
  readonly recordLocation = signal<{ id: string; name: string; code: string } | null>(null);

  protected buildForm(): FormGroup {
    return this.fb.group({
      location_id: ['', Validators.required],
      academic_year: ['', V.ACADEMIC_YEAR],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      is_default: [false],
      is_active: [true],
      notes: ['', V.NOTES],
    });
  }

  override ngOnInit(): void {
    this.form = this.buildForm();
    // Pre-fill the location on create — matches the pattern used elsewhere
    // so the user doesn't have to re-pick the location they're working in.
    if (!this.cs.getRouteParam(this.route, 'id')) {
      const preferred = this.locationCtx.preferredLocationId();
      if (preferred) this.form.patchValue({ location_id: preferred });
    }
    this.detectModeAndLoad();
  }

  protected override onRecordLoaded(data: any): void {
    this.form.patchValue({
      ...data,
      // Dates come back as ISO strings; <input type="date"> needs yyyy-mm-dd.
      start_date: data.start_date ? String(data.start_date).slice(0, 10) : '',
      end_date: data.end_date ? String(data.end_date).slice(0, 10) : '',
    });
    this.recordLocation.set(data.location_id ? {
      id: data.location_id,
      name: data.location_name || '',
      code: data.location_code || '',
    } : null);
  }

  protected override beforeSubmit(): boolean {
    const { start_date, end_date } = this.form.value;
    if (start_date && end_date && new Date(end_date) <= new Date(start_date)) {
      // Route to a toast rather than the inline banner — mutating
      // `errorMessage` synchronously inside the click handler flips the
      // `@if (errorMessage)` block and triggers NG0100 in dev. The toast is
      // also a nicer UX for transient validation messages.
      this.cs.showToastr({ type: 'error', message: 'End date must be after start date' });
      return false;
    }
    return true;
  }
}
