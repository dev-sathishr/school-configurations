import { Component, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LocationFieldComponent } from '../../../../../shared/components/location-field/location-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import { LocationContextService } from '../../../../../core/services/location-context.service';
import { API } from '../../../../../core/api/endpoints';
import * as V from '../../../../../shared/validators/common';

@Component({
  selector: 'app-academic-year-form',
  templateUrl: './academic-year-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LocationFieldComponent, LoaderComponent, BreadcrumbComponent],
})
export class AcademicYearFormComponent extends FormPageBase {
  listRoute = '/settings/academic-year';
  resourcePath = API.academicYears.base;

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
    this.wireRangeAutofill();
    this.detectModeAndLoad();
  }

  /**
   * Smart autofill between the three date fields so the user only ever picks
   * one thing:
   *
   *   - Type `2025-2026` → start_date = 2025-06-01, end_date = 2026-05-31
   *     (typical Indian academic calendar; user can still adjust).
   *   - Pick a start_date → end_date auto-fills to one year later minus one
   *     day, and the academic_year label syncs to the matching YYYY-YYYY.
   *
   * Only rewrites a field that's empty (or in the academic-year case, the
   * other two) so we don't clobber manual edits. `emitEvent: false` on the
   * patch prevents the subscriptions from re-entering each other.
   */
  private wireRangeAutofill(): void {
    this.form.get('academic_year')?.valueChanges.subscribe((val: string) => {
      const match = /^(\d{4})-(\d{4})$/.exec(String(val || ''));
      if (!match) return;
      const start = Number(match[1]);
      if (Number(match[2]) !== start + 1) return;
      if (!this.form.get('start_date')?.value) {
        this.form.get('start_date')?.setValue(`${start}-06-01`, { emitEvent: false });
      }
      if (!this.form.get('end_date')?.value) {
        this.form.get('end_date')?.setValue(`${start + 1}-05-31`, { emitEvent: false });
      }
    });

    this.form.get('start_date')?.valueChanges.subscribe((val: string) => {
      if (!val) return;
      const start = new Date(val);
      if (isNaN(start.getTime())) return;
      if (!this.form.get('end_date')?.value) {
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);
        end.setDate(end.getDate() - 1);
        this.form.get('end_date')?.setValue(end.toISOString().slice(0, 10), { emitEvent: false });
      }
      if (!this.form.get('academic_year')?.value) {
        const y = start.getFullYear();
        this.form.get('academic_year')?.setValue(`${y}-${y + 1}`, { emitEvent: false });
      }
    });
  }

  protected override onRecordLoaded(data: any): void {
    this.form.patchValue({
      ...data,
      location_id: data.location?.id || '',
      // Dates come back as ISO strings; <input type="date"> needs yyyy-mm-dd.
      start_date: data.start_date ? String(data.start_date).slice(0, 10) : '',
      end_date: data.end_date ? String(data.end_date).slice(0, 10) : '',
    });
    this.recordLocation.set(data.location?.id ? {
      id: data.location.id,
      name: data.location.name || '',
      code: data.location.code || '',
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

  protected override afterSave(res: any): void {
    this.cs.showToastr({ type: 'success', message: res?.message || 'Saved successfully' });
    super.afterSave(res);
  }
}
