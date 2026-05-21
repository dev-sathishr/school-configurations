import {
  Component, Input, Output, EventEmitter, OnInit, OnChanges,
  SimpleChanges, inject, ChangeDetectorRef,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CommonService } from '../../services/common/common.service';
import { ToastService } from '../../services/toast/toast.service';
import { ButtonComponent } from '../button/button.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { LoaderComponent } from '../loader/loader.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { API } from '../../../core/api/endpoints';

export interface ChildFieldDef {
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  show_in_list: boolean;
  validators?: any;
  select_options?: any;
  ref_doctype_slug?: string;
  col_span?: number;
}

export interface ChildDocTypeMeta {
  slug: string;
  label: string;
  fields: ChildFieldDef[];
}

@Component({
  selector: 'app-child-table',
  templateUrl: './child-table.component.html',
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, ConfirmDialogComponent],
})
export class ChildTableComponent implements OnInit, OnChanges {
  /** DocType slug of the PARENT record */
  @Input() parentSlug!: string;
  /** ID of the saved parent record. If null, rows are buffered locally only. */
  @Input() parentId: string | null = null;
  /** field_name of the child-table field on the parent DocType */
  @Input() fieldName!: string;
  /** Child DocType metadata (fields to show) */
  @Input() childMeta!: ChildDocTypeMeta;
  /** Read-only mode */
  @Input() viewMode = false;
  /** Whether form was submitted (show validation errors) */
  @Input() submitted = false;

  /** Emits current rows whenever they change (used in create-mode before parentId exists) */
  @Output() rowsChange = new EventEmitter<any[]>();

  private cs = inject(CommonService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  rows: any[] = [];
  loading = false;
  saving = false;

  // Inline edit state
  editingRowIndex: number | null = null;
  editingForm: FormGroup | null = null;
  isNewRow = false;

  // Delete confirm
  confirmVisible = false;
  pendingDeleteIndex: number | null = null;

  get listColumns(): ChildFieldDef[] {
    return (this.childMeta?.fields || []).filter(f => f.show_in_list);
  }

  get allFields(): ChildFieldDef[] {
    return (this.childMeta?.fields || []).filter(f =>
      !['address', 'file', 'relation-widget', 'child-table'].includes(f.field_type)
    );
  }

  ngOnInit(): void {
    if (this.parentId) {
      this.loadRows();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['parentId'] && this.parentId && !changes['parentId'].firstChange) {
      // Parent was just saved — push buffered rows to server
      this.pushBufferedRows();
    }
  }

  private loadRows(): void {
    if (!this.parentId) return;
    this.loading = true;
    this.cs.getService({
      url: API.engineChildRecords.list(this.parentSlug, this.parentId, this.fieldName),
    }).subscribe({
      next: (res: any) => {
        this.rows = res?.data || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  private pushBufferedRows(): void {
    if (!this.parentId || this.rows.length === 0) return;
    this.cs.postService({
      url: API.engineChildRecords.replace(this.parentSlug, this.parentId, this.fieldName),
      payload: { rows: this.rows },
    }).subscribe({
      next: (res: any) => {
        this.rows = res?.data || this.rows;
        this.cdr.markForCheck();
      },
    });
  }

  addRow(): void {
    this.editingRowIndex = -1;
    this.isNewRow = true;
    this.editingForm = this.buildForm({});
  }

  editRow(index: number): void {
    this.editingRowIndex = index;
    this.isNewRow = false;
    this.editingForm = this.buildForm(this.rows[index]);
  }

  cancelEdit(): void {
    this.editingRowIndex = null;
    this.editingForm = null;
    this.isNewRow = false;
  }

  saveRow(): void {
    if (!this.editingForm) return;
    if (this.editingForm.invalid) {
      this.editingForm.markAllAsTouched();
      return;
    }

    const data = this.editingForm.value;

    if (this.parentId) {
      this.saving = true;
      if (this.isNewRow) {
        this.cs.postService({
          url: API.engineChildRecords.create(this.parentSlug, this.parentId, this.fieldName),
          payload: data,
        }).subscribe({
          next: (res: any) => {
            this.rows.push(res?.data);
            this.rowsChange.emit(this.rows);
            this.cancelEdit();
            this.saving = false;
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            this.toast.error(err?.error?.message || 'Failed to save row');
            this.saving = false;
            this.cdr.markForCheck();
          },
        });
      } else {
        const rowId = this.rows[this.editingRowIndex!]?.id;
        this.cs.putService({
          url: API.engineChildRecords.update(this.parentSlug, this.parentId, this.fieldName, rowId),
          payload: data,
        }).subscribe({
          next: (res: any) => {
            this.rows[this.editingRowIndex!] = res?.data;
            this.rowsChange.emit(this.rows);
            this.cancelEdit();
            this.saving = false;
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            this.toast.error(err?.error?.message || 'Failed to update row');
            this.saving = false;
            this.cdr.markForCheck();
          },
        });
      }
    } else {
      // No parentId yet — buffer locally
      if (this.isNewRow) {
        this.rows.push({ ...data, _local: true });
      } else {
        this.rows[this.editingRowIndex!] = { ...this.rows[this.editingRowIndex!], ...data, _local: true };
      }
      this.rowsChange.emit(this.rows);
      this.cancelEdit();
      this.cdr.markForCheck();
    }
  }

  requestDelete(index: number): void {
    this.pendingDeleteIndex = index;
    this.confirmVisible = true;
  }

  onConfirmDelete(): void {
    this.confirmVisible = false;
    if (this.pendingDeleteIndex === null) return;
    const index = this.pendingDeleteIndex;
    this.pendingDeleteIndex = null;

    const row = this.rows[index];
    if (this.parentId && row?.id && !row._local) {
      this.cs.deleteService({
        url: API.engineChildRecords.delete(this.parentSlug, this.parentId, this.fieldName, row.id),
      }).subscribe({
        next: () => {
          this.rows.splice(index, 1);
          this.rowsChange.emit(this.rows);
          this.pendingDeleteIndex = null;
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.toast.error(err?.error?.message || 'Failed to delete row');
          this.pendingDeleteIndex = null;
        },
      });
    } else {
      this.rows.splice(index, 1);
      this.rowsChange.emit(this.rows);
      this.pendingDeleteIndex = null;
      this.cdr.markForCheck();
    }
  }

  onCancelDelete(): void {
    this.confirmVisible = false;
    this.pendingDeleteIndex = null;
  }

  private buildForm(data: any): FormGroup {
    const group: Record<string, any> = {};
    for (const f of this.allFields) {
      const v = f.validators || {};
      const fvs = [];
      if (v.required) fvs.push(Validators.required);
      if (v.min) fvs.push(Validators.minLength(v.min));
      if (v.max) fvs.push(Validators.maxLength(v.max));
      group[f.field_name] = [data[f.field_name] ?? null, fvs];
    }
    return this.fb.group(group);
  }

  fieldOptions(f: ChildFieldDef): any[] {
    if (f.field_type === 'select' && Array.isArray(f.select_options)) return f.select_options;
    return [];
  }

  displayValue(row: any, f: ChildFieldDef): string {
    const v = row[f.field_name];
    if (v === null || v === undefined || v === '') return '—';
    if (f.field_type === 'checkbox') return v ? 'Yes' : 'No';
    if (f.field_type === 'select' && Array.isArray(f.select_options)) {
      return f.select_options.find((o: any) => o.value === v)?.label ?? v;
    }
    return String(v);
  }

  get hasRows(): boolean { return this.rows.length > 0; }

  safeFieldType(type: string): 'text' | 'email' | 'password' | 'url' | 'number' | 'date' | 'select' | 'async-select' | 'textarea' | 'checkbox' | 'phone' {
    const allowed = ['text','email','password','url','number','date','select','async-select','textarea','checkbox','phone'];
    return (allowed.includes(type) ? type : 'text') as any;
  }

  asyncDropdownUrl(f: ChildFieldDef): string {
    if (f.field_type !== 'async-select' || !f.ref_doctype_slug) return '';
    return `/engine/records/${f.ref_doctype_slug}/dropdown`;
  }
}
