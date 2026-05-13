import { Component, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormPageBase } from '../../../../shared/components/form-page/form-page.base';
import { FieldEditorComponent, FieldRow } from '../field-editor/field-editor.component';
import { API } from '../../../../core/api/endpoints';
import * as V from '../../../../shared/validators/common';

const DISPLAY_MODE_OPTIONS = [
  { value: 'page',      label: 'Page (default)' },
  { value: 'modal',     label: 'Modal' },
  { value: 'tab-group', label: 'Tab Group' },
];

const MODAL_SIZE_OPTIONS = [
  { value: 'small',   label: 'Small' },
  { value: 'medium',  label: 'Medium' },
  { value: 'large',   label: 'Large' },
  { value: 'xlarge',  label: 'Extra Large' },
];

@Component({
  selector: 'app-doctype-form',
  templateUrl: './doctype-form.component.html',
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FormFieldComponent,
    LoaderComponent, BreadcrumbComponent, FieldEditorComponent],
})
export class DoctypeFormComponent extends FormPageBase {
  listRoute = '/engine/meta';

  fields: FieldRow[] = [];
  fieldError = '';

  displayModeOptions = DISPLAY_MODE_OPTIONS;
  modalSizeOptions   = MODAL_SIZE_OPTIONS;

  // Tab children: list of slugs entered as comma-separated or managed as chips
  tabChildrenRaw = signal<string>('');
  tabChildren = computed(() =>
    this.tabChildrenRaw().split(',').map(s => s.trim()).filter(Boolean)
  );

  get displayMode(): string { return this.form.get('display_mode')?.value ?? 'page'; }
  get isModal():    boolean { return this.displayMode === 'modal'; }
  get isTabGroup(): boolean { return this.displayMode === 'tab-group'; }

  protected buildForm(): FormGroup {
    return this.fb.group({
      label:              ['', V.NAME],
      plural_label:       ['', V.NAME],
      slug:               ['', [Validators.required, Validators.pattern(/^[a-z][a-z0-9_-]{1,62}$/)]],
      icon:               ['', V.NOTES],
      description:        ['', V.NOTES],
      is_location_scoped: [false],
      auto_create_table:  [true],
      is_active:          [true],
      display_mode:       ['page'],
      modal_size:         ['medium'],
    });
  }

  protected override onRecordLoaded(data: any): void {
    this.form.patchValue({
      label:              data.label,
      plural_label:       data.plural_label,
      slug:               data.slug,
      icon:               data.icon ?? '',
      description:        data.description ?? '',
      is_location_scoped: data.is_location_scoped ?? false,
      auto_create_table:  data.auto_create_table ?? true,
      is_active:          data.is_active ?? true,
      display_mode:       data.display_mode ?? 'page',
      modal_size:         data.modal_size ?? 'medium',
    });
    this.form.get('slug')?.disable();
    const children = Array.isArray(data.tab_children) ? data.tab_children : [];
    this.tabChildrenRaw.set(children.join(', '));
    this.fields = (data.fields ?? []).map((f: any) => ({
      id:               f.id,
      field_name:       f.field_name,
      field_label:      f.field_label,
      field_type:       f.field_type,
      display_order:    f.display_order,
      col_span:         f.col_span ?? 6,
      section_name:     f.section_name ?? '',
      is_required:      f.validators?.required ?? false,
      is_unique:        f.is_unique ?? false,
      is_searchable:    f.is_searchable ?? true,
      show_in_list:     f.show_in_list ?? true,
      help_text:        f.help_text ?? '',
      select_options:   f.select_options ?? null,
      ref_doctype_slug: f.ref_doctype_slug ?? '',
      is_active:        f.is_active ?? true,
      min_length:       f.validators?.min ?? null,
      max_length:       f.validators?.max ?? null,
      transform:        f.validators?.transform ?? '',
    }));
  }

  override get resourcePath(): string { return API.engineMeta.base; }

  protected override unwrapResponse(res: any): any { return res?.data ?? res; }

  protected override beforeSubmit(): boolean {
    if (!this.isTabGroup && this.fields.length === 0) {
      this.fieldError = 'At least one field is required';
      return false;
    }
    if (this.isTabGroup && this.tabChildren().length === 0) {
      this.fieldError = 'At least one child DocType slug is required for Tab Group';
      return false;
    }
    this.fieldError = '';
    return true;
  }

  protected override toPayload(): any {
    const val = this.form.getRawValue();
    return {
      ...val,
      fields:       this.isTabGroup ? [] : this.fields,
      tab_children: this.isTabGroup ? this.tabChildren() : null,
    };
  }

  protected override afterSave(res: any): void {
    this.saving = false;
    this.cs.showToastr({ type: 'success', message: res?.message || 'Saved successfully' });
    this.cs.navigate({ url: this.listRoute });
  }

  protected override detectModeAndLoad(): void {
    const id = this.cs.getRouteParam(this.route, 'slug');
    if (id) {
      this.editId = id;
      const mode = this.route.snapshot.data['mode'] ?? (this.route.snapshot.url.some(s => s.path === 'view') ? 'view' : 'edit');
      this.editMode = mode !== 'view';
      this.viewMode = mode === 'view';
      this.loading = true;
      this.cs.getService({ url: API.engineMeta.detail(id) }).subscribe({
        next: (res: any) => {
          this.loading = false;
          this.onRecordLoaded(this.unwrapResponse(res));
          this.cdr.detectChanges();
        },
        error: () => { this.loading = false; this.cdr.detectChanges(); },
      });
    }
  }
}
