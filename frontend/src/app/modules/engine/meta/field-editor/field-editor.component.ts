import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ADDRESS_TYPE_OPTIONS, FIELD_TYPE_OPTIONS, FILE_DISPLAY_STYLE_OPTIONS, TRANSFORM_OPTIONS } from '../../../../core/constants/enums';

export interface FieldRow {
  id?: number;
  field_name: string;
  field_label: string;
  field_type: string;
  display_order: number;
  col_span: number;
  section_name: string;
  is_required: boolean;
  is_unique: boolean;
  is_searchable: boolean;
  show_in_list: boolean;
  help_text: string;
  select_options: any;
  ref_doctype_slug: string;
  is_active: boolean;
  // validator extensions
  min_length: number | null;
  max_length: number | null;
  transform: string;
  // file-specific
  file_display_style: string;
  // address-specific
  address_types: string[];
  // relation-widget-specific
  rw_source_table: string;
  rw_junction_table: string;
  rw_parent_key: string;
  rw_child_key: string;
  rw_has_default: boolean;
  rw_label_field: string;
  rw_sub_field: string;
}

const FULL_SPAN_TYPES = new Set(['address', 'relation-widget']);

@Component({
  selector: 'app-field-editor',
  templateUrl: './field-editor.component.html',
  imports: [ReactiveFormsModule, FormFieldComponent, ButtonComponent],
})
export class FieldEditorComponent implements OnInit, OnChanges {
  @Input() fields: FieldRow[] = [];
  @Input() viewMode = false;
  @Output() fieldsChange = new EventEmitter<FieldRow[]>();

  form!: FormGroup;
  readonly fieldTypeOptions = FIELD_TYPE_OPTIONS;
  readonly transformOptions = TRANSFORM_OPTIONS;
  readonly fileDisplayStyleOptions = FILE_DISPLAY_STYLE_OPTIONS;
  readonly addressTypeOptions = ADDRESS_TYPE_OPTIONS;

  readonly colSpanOptions = [
    { value: 3,  hint: '¼' },
    { value: 4,  hint: '⅓' },
    { value: 6,  hint: '½' },
    { value: 8,  hint: '⅔' },
    { value: 9,  hint: '¾' },
    { value: 12, hint: 'Full' },
  ];

  dragIndex: number | null = null;
  dragOverIndex: number | null = null;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.buildForm();
  }

  ngOnChanges(): void {
    if (this.form) this.buildForm();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      rows: this.fb.array((this.fields || []).map(f => this.makeRow(f))),
    });
    this.form.valueChanges.subscribe(() => this.emit());
  }

  get rows(): FormArray {
    return this.form.get('rows') as FormArray;
  }

  private makeRow(f: Partial<FieldRow> = {}): FormGroup {
    const storedMeta = typeof f.select_options === 'object' && f.select_options !== null
      ? f.select_options : {};
    const fileDisplayStyle = f.file_display_style ?? storedMeta.displayStyle ?? 'avatar';
    const addressTypes = f.address_types ?? storedMeta.addressTypes ?? ADDRESS_TYPE_OPTIONS.map(o => o.value);

    return this.fb.group({
      id:                 [f.id ?? null],
      field_name:         [f.field_name ?? '', [Validators.required, Validators.pattern(/^[a-z][a-z0-9_]{0,62}$/)]],
      field_label:        [f.field_label ?? '', Validators.required],
      field_type:         [f.field_type ?? 'text', Validators.required],
      display_order:      [f.display_order ?? this.rows?.length ?? 0],
      col_span:           [f.col_span ?? 6],
      section_name:       [f.section_name ?? ''],
      is_required:        [f.is_required ?? false],
      is_unique:          [f.is_unique ?? false],
      is_searchable:      [f.is_searchable ?? true],
      show_in_list:       [f.show_in_list ?? true],
      help_text:          [f.help_text ?? ''],
      select_options:     [Array.isArray(f.select_options) ? JSON.stringify(f.select_options, null, 2) : (typeof f.select_options === 'string' ? f.select_options : '')],
      ref_doctype_slug:   [f.ref_doctype_slug ?? ''],
      is_active:          [f.is_active ?? true],
      min_length:         [f.min_length ?? null],
      max_length:         [f.max_length ?? null],
      transform:          [f.transform ?? ''],
      file_display_style: [fileDisplayStyle],
      address_types:      [addressTypes],
      // relation-widget fields
      rw_source_table:    [f.rw_source_table   ?? storedMeta.sourceTable   ?? ''],
      rw_junction_table:  [f.rw_junction_table ?? storedMeta.junctionTable ?? ''],
      rw_parent_key:      [f.rw_parent_key     ?? storedMeta.parentKey     ?? ''],
      rw_child_key:       [f.rw_child_key      ?? storedMeta.childKey      ?? ''],
      rw_has_default:     [f.rw_has_default    ?? !!(storedMeta.extraColumns?.is_default)],
      rw_label_field:     [f.rw_label_field    ?? storedMeta.displayFields?.label ?? 'name'],
      rw_sub_field:       [f.rw_sub_field      ?? storedMeta.displayFields?.sub   ?? 'code'],
    });
  }

  addRow(): void {
    this.rows.push(this.makeRow({ display_order: this.rows.length }));
    this.emit();
  }

  removeRow(i: number): void {
    this.rows.removeAt(i);
    this.emit();
  }

  // ── Drag-and-drop ──────────────────────────────────────────────────

  onDragStart(i: number): void {
    this.dragIndex = i;
  }

  onDragOver(event: DragEvent, i: number): void {
    event.preventDefault();
    this.dragOverIndex = i;
  }

  onDrop(i: number): void {
    if (this.dragIndex === null || this.dragIndex === i) {
      this.dragIndex = null;
      this.dragOverIndex = null;
      return;
    }
    const from = this.dragIndex;
    const to = i;
    const ctrl = this.rows.at(from);
    this.rows.removeAt(from);
    this.rows.insert(to, ctrl);
    this.dragIndex = null;
    this.dragOverIndex = null;
    this.emit();
  }

  onDragEnd(): void {
    this.dragIndex = null;
    this.dragOverIndex = null;
  }

  setColSpan(i: number, value: number): void {
    this.rows.at(i).get('col_span')?.setValue(value);
  }

  isFullSpanType(i: number): boolean {
    return FULL_SPAN_TYPES.has(this.fieldTypeAt(i));
  }

  // ── Emit ───────────────────────────────────────────────────────────

  private emit(): void {
    const raw: any[] = this.rows.value;
    this.fieldsChange.emit(raw.map((r, i) => {
      const validators: Record<string, any> = {};
      if (r.is_required) validators['required'] = true;
      if (r.min_length != null && r.min_length !== '') validators['min'] = Number(r.min_length);
      if (r.max_length != null && r.max_length !== '') validators['max'] = Number(r.max_length);
      if (r.transform) validators['transform'] = r.transform;

      let select_options = r.select_options;
      if (r.field_type === 'select' && typeof r.select_options === 'string' && r.select_options.trim()) {
        try { select_options = JSON.parse(r.select_options); } catch { select_options = []; }
      }
      if (r.field_type === 'file') {
        select_options = { displayStyle: r.file_display_style || 'avatar', fileType: r.field_name };
      }
      if (r.field_type === 'address') {
        select_options = { addressTypes: r.address_types ?? ADDRESS_TYPE_OPTIONS.map(o => o.value) };
      }
      if (r.field_type === 'relation-widget') {
        select_options = {
          sourceTable:   r.rw_source_table,
          junctionTable: r.rw_junction_table,
          parentKey:     r.rw_parent_key,
          childKey:      r.rw_child_key,
          extraColumns:  r.rw_has_default ? { is_default: true } : {},
          displayStyle:  'checkbox',
          displayFields: { label: r.rw_label_field || 'name', sub: r.rw_sub_field || 'code' },
        };
      }

      const col_span = FULL_SPAN_TYPES.has(r.field_type) ? 12 : (r.col_span ?? 6);
      return { ...r, display_order: i, col_span, validators, select_options };
    }));
  }

  isTextLike(i: number): boolean {
    return ['text', 'email', 'url', 'textarea', 'password'].includes(this.fieldTypeAt(i));
  }

  isFile(i: number): boolean { return this.fieldTypeAt(i) === 'file'; }
  isAddress(i: number): boolean { return this.fieldTypeAt(i) === 'address'; }
  isRelationWidget(i: number): boolean { return this.fieldTypeAt(i) === 'relation-widget'; }

  toggleAddressType(i: number, value: string, checked: boolean): void {
    const ctrl = this.rows.at(i).get('address_types');
    if (!ctrl) return;
    const current: string[] = ctrl.value ?? [];
    const updated = checked ? [...current, value] : current.filter(v => v !== value);
    ctrl.setValue(updated);
  }

  fieldTypeAt(i: number): string {
    return this.rows.at(i).get('field_type')?.value ?? 'text';
  }

  asGroup(ctrl: any): FormGroup { return ctrl as FormGroup; }
}
