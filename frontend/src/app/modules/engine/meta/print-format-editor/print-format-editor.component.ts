import { Component, Input, OnInit, OnChanges, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonService } from '../../../../shared/services/common/common.service';
import { API } from '../../../../core/api/endpoints';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

export interface PrintFormat {
  id: string;
  name: string;
  html_template: string;
  is_default: boolean;
  is_active: boolean;
}

@Component({
  selector: 'app-print-format-editor',
  templateUrl: './print-format-editor.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, ConfirmDialogComponent],
})
export class PrintFormatEditorComponent implements OnInit, OnChanges {
  @Input() slug = '';
  @Input() fieldNames: string[] = [];

  private fb = inject(FormBuilder);
  private cs = inject(CommonService);
  private cdr = inject(ChangeDetectorRef);

  formats: PrintFormat[] = [];
  loading = false;
  saving = false;
  editingId: string | null = null;
  showForm = false;
  submitted = false;
  confirmDeleteId: string | null = null;
  private loadedSlug = '';

  form!: FormGroup;

  readonly defaultTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    h1   { font-size: 22px; margin-bottom: 4px; }
    .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { font-size: 14px; margin-bottom: 12px; }
    table  { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
    th     { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>{{ doc.name }}</h1>
  <hr />
  <!-- Add your fields below using {{ doc.field_name }} -->
</body>
</html>`;

  ngOnInit(): void { this.load(); }
  ngOnChanges(): void { if (this.slug && this.slug !== this.loadedSlug) this.load(); }

  private load(): void {
    if (!this.slug) return;
    this.loadedSlug = this.slug;
    this.loading = true;
    this.cs.getService({ url: API.enginePrintFormats.list(this.slug) }).subscribe({
      next: (res: any) => {
        this.formats = res?.data ?? [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.formats = [];
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openNew(): void {
    this.editingId = null;
    this.submitted = false;
    this.form = this.buildForm();
    this.showForm = true;
  }

  openEdit(pf: PrintFormat): void {
    this.editingId = pf.id;
    this.submitted = false;
    this.form = this.buildForm(pf);
    this.showForm = true;
  }

  cancelForm(): void { this.showForm = false; this.editingId = null; }

  private buildForm(pf?: Partial<PrintFormat>): FormGroup {
    return this.fb.group({
      name:          [pf?.name ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(128)]],
      html_template: [pf?.html_template ?? this.defaultTemplate, Validators.required],
      is_default:    [pf?.is_default ?? false],
    });
  }

  save(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    this.saving = true;
    const payload = this.form.value;
    const obs = this.editingId
      ? this.cs.putService({ url: API.enginePrintFormats.detail(this.slug, this.editingId), payload })
      : this.cs.postService({ url: API.enginePrintFormats.create(this.slug), payload });

    obs.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.cdr.markForCheck(); this.load(); },
      error: () => { this.saving = false; this.cdr.markForCheck(); },
    });
  }

  confirmDelete(id: string): void { this.confirmDeleteId = id; }

  onDeleteConfirmed(): void {
    if (!this.confirmDeleteId) return;
    this.cs.deleteService({ url: API.enginePrintFormats.detail(this.slug, this.confirmDeleteId) }).subscribe({
      next: () => { this.confirmDeleteId = null; this.cdr.markForCheck(); this.load(); },
      error: () => { this.confirmDeleteId = null; this.cdr.markForCheck(); },
    });
  }

  print(pf: PrintFormat): void {
    // Opens a blank window; render endpoint called with a placeholder recordId
    // Actual printing happens from the DynamicFormComponent
    window.open(`/print-preview/${this.slug}/${pf.id}`, '_blank');
  }

  insertVariable(field: string): void {
    const ctrl = this.form?.get('html_template');
    if (!ctrl) return;
    ctrl.setValue(ctrl.value + `{{ doc.${field} }}`);
  }

  get f() { return this.form?.controls; }
}
