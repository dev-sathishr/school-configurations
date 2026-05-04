import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { API } from '../../../../../core/api/endpoints';
import { RECOMMENDER_CATEGORY_OPTIONS, RecommenderCategory } from '../../../../../core/constants/enums';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { AddressComponent, Address } from '../../../../../shared/components/address/address.component';
import * as V from '../../../../../shared/validators/common';

interface CategorySource {
  url: string;
  labelKey: string;
}

@Component({
  selector: 'app-recommender-form',
  templateUrl: './recommender-form.component.html',
  imports: [ReactiveFormsModule, FormFieldComponent, BreadcrumbComponent, ButtonComponent, LoaderComponent, AddressComponent],
})
export class RecommenderFormComponent extends FormPageBase {
  listRoute    = '/student/recommenders';
  resourcePath = API.recommenders.base;

  @Input() inlineMode = false;
  @Output() savedInline = new EventEmitter<any>();
  @Output() cancelled   = new EventEmitter<void>();

  readonly categoryOptions = RECOMMENDER_CATEGORY_OPTIONS;

  addresses: Address[] = [];
  addressError = '';

  // Drives the dynamic Name dropdown based on selected category
  readonly nameSource = signal<CategorySource | null>(null);
  readonly selectedNameLabel = signal('');

  private static readonly CATEGORY_SOURCES: Record<Exclude<RecommenderCategory, 'other'>, CategorySource> = {
    management: { url: API.users.dropdown,                  labelKey: 'full_name' },
    vip:        { url: API.recommenders.dropdown,           labelKey: 'name' },
    parent:     { url: API.studentFamilyInfo.globalSearch,  labelKey: 'name' },
    staff:      { url: API.employees.dropdown,              labelKey: 'employee_name' },
  };

  protected buildForm(): FormGroup {
    const form = this.fb.group({
      name:       ['', V.NAME],
      category:   ['', V.requiredMaxLength(50)],
      contact_no: [{ code: '+91', number: '' }],
      email:      ['', V.EMAIL],
      occupation: ['', V.maxLength(100)],
      notes:      ['', V.NOTES],
      is_active:  [true],
    });

    form.get('category')!.valueChanges.subscribe((cat: string | null) => {
      this.onCategoryChange(cat as RecommenderCategory | null);
    });

    return form;
  }

  override ngOnInit(): void {
    this.form = this.buildForm();
    if (!this.inlineMode) {
      this.detectModeAndLoad();
    }
  }

  protected override onRecordLoaded(d: any): void {
    this.form.patchValue({
      ...d,
      contact_no: { code: d.contact_code || '+91', number: d.contact_no || '' },
    });
    this.addresses = d.addresses || [];
    if (d.name) this.selectedNameLabel.set(d.name);
    // Re-derive nameSource for the loaded category so view-mode shows the dropdown source
    this.applyCategorySource(d.category);
  }

  protected override toPayload(): any {
    const val = this.form.value;
    return {
      ...val,
      contact_code: val.contact_no?.code   || '+91',
      contact_no:   val.contact_no?.number || '',
      addresses:    this.addresses,
    };
  }

  protected override beforeSubmit(): boolean {
    const contact = this.form.get('contact_no')?.value;
    const hasContact = !!contact?.number?.trim();
    if (!hasContact) this.form.get('contact_no')?.markAsTouched();
    this.addressError = this.addresses.length === 0 ? 'At least one address is required' : '';

    if (this.form.invalid || !hasContact || this.addressError) {
      this.cs.showToastr({ type: 'error', message: 'Please fix the errors', description: 'Fill all required fields before submitting' });
      return false;
    }
    return true;
  }

  onAddressesChange(addresses: Address[]): void {
    this.addresses = addresses;
    if (addresses.length > 0) this.addressError = '';
  }

  protected override afterSave(res: any): void {
    this.saving = false;
    if (this.inlineMode) {
      this.savedInline.emit(res?.data ?? res);
    } else {
      this.cs.navigate({ url: this.listRoute });
    }
  }

  override cancel(): void {
    if (this.inlineMode) {
      this.cancelled.emit();
    } else {
      this.cs.navigate({ url: this.listRoute });
    }
  }

  // ── Category-driven Name dropdown ──────────────────────────────────

  private applyCategorySource(category: string | null | undefined): void {
    if (!category || category === 'other') {
      this.nameSource.set(null);
      return;
    }
    const src = RecommenderFormComponent.CATEGORY_SOURCES[category as Exclude<RecommenderCategory, 'other'>];
    this.nameSource.set(src || null);
  }

  private onCategoryChange(category: RecommenderCategory | null): void {
    this.applyCategorySource(category);
    // Reset name + dependent fields whenever category changes (skip while loading a record)
    if (this.loading) return;
    this.form.patchValue({
      name:       '',
      contact_no: { code: '+91', number: '' },
      email:      '',
      occupation: '',
    });
    this.addresses = [];
    this.selectedNameLabel.set('');
  }

  /**
   * Auto-fill from the selected dropdown record. Field names vary per source;
   * we fall back through likely keys so the same handler works for all categories.
   */
  onNameSelected(item: any): void {
    if (!item) return;

    const name = item.full_name || item.name || item.employee_name || item.username || '';
    const code = item.contact_code || item.phone_code || '+91';
    const phone = item.contact_no || item.phone || item.mobile_no || '';
    const email = item.email || item.email_id || '';
    const occupation = item.occupation || item.designation_name || '';

    this.form.patchValue({
      name,
      contact_no: { code, number: phone },
      email,
      occupation,
    });
    this.selectedNameLabel.set(name);

    // Deep-copy addresses without ids so they save as new rows under the new recommender
    if (Array.isArray(item.addresses) && item.addresses.length > 0) {
      this.addresses = item.addresses.map((a: any) => {
        const { id: _ignored, mapping_id: _m, ...rest } = a;
        return { ...rest, address_type: rest.address_type || 'primary' };
      });
      this.addressError = '';
    }
  }
}
