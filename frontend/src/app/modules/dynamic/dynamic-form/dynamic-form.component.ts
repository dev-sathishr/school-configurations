import { Component, OnInit, OnDestroy, ViewChildren, QueryList, inject, signal, Input, Output, EventEmitter } from '@angular/core';
import { lastValueFrom, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { NgTemplateOutlet } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { LocationFieldComponent } from '../../../shared/components/location-field/location-field.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { AddressComponent, Address } from '../../../shared/components/address/address.component';
import { ADDRESS_TYPE_OPTIONS, SelectOption } from '../../../core/constants/enums';
import { FileUploadComponent, UploadedFile } from '../../../shared/components/file-upload/file-upload.component';
import { RelationWidgetComponent, RelationWidgetConfig } from '../../../shared/components/relation-widget/relation-widget.component';
import { ChildTableComponent, ChildDocTypeMeta } from '../../../shared/components/child-table/child-table.component';
import { FormPageBase } from '../../../shared/components/form-page/form-page.base';
import { LocationContextService } from '../../../core/services/location-context.service';
import { DoctypeConfigService, DoctypeConfig, FieldDef } from '../doctype-config.service';
import { API } from '../../../core/api/endpoints';

interface FieldSection {
  title: string;
  fields: FieldDef[];
}

@Component({
  selector: 'app-dynamic-form',
  templateUrl: './dynamic-form.component.html',
  imports: [NgTemplateOutlet, ReactiveFormsModule, ButtonComponent, FormFieldComponent,
    LocationFieldComponent, LoaderComponent, BreadcrumbComponent, AddressComponent,
    FileUploadComponent, RelationWidgetComponent, ChildTableComponent],
})
export class DynamicFormComponent extends FormPageBase implements OnInit, OnDestroy {
  @Input() embedMode = false;      // true when rendered inside a modal
  @Input() embedSlug = '';         // slug override for embed mode
  @Input() embedId: string | null = null;    // record id for edit in embed mode
  @Input() embedViewMode = false;  // view-only in embed mode
  @Output() saved = new EventEmitter<void>(); // emits after save in embed mode
  @Output() cancelled = new EventEmitter<void>();

  @ViewChildren(FileUploadComponent) fileUploads!: QueryList<FileUploadComponent>;
  @ViewChildren(RelationWidgetComponent) relationWidgets!: QueryList<RelationWidgetComponent>;

  readonly locationCtx = inject(LocationContextService);
  private readonly doctypeConfig = inject(DoctypeConfigService);

  config: DoctypeConfig | null = null;
  formFields: FieldDef[] = [];
  groupedSections: FieldSection[] = [];
  configLoading = true;
  notFound = false;

  addressData: Record<string, Address[]> = {};
  addressErrors: Record<string, string> = {};
  uploadedFiles: Record<string, UploadedFile | null> = {};
  initialLabels: Record<string, string> = {};
  relationErrors: Record<string, string> = {};
  childMetas: Record<string, ChildDocTypeMeta> = {};
  childRows: Record<string, any[]> = {};
  namingSeriesPreviews: Record<string, string> = {};
  namingSeriesValues: Record<string, string> = {};

  workflowState: string | null = null;
  workflowActions: { action_label: string; to_state: string }[] = [];
  transitioningAction: string | null = null;

  // depends_on: fields hidden because their condition is false
  hiddenByCondition = new Set<string>();
  // subscriptions for value-change watchers (fetch_from + depends_on)
  private _fieldSubs: Subscription[] = [];

  recordLocation = signal<{ id: string; name: string; code: string } | null>(null);

  get listRoute(): string {
    const slug = this.config?.slug;
    if (!slug) return '/settings';
    for (const menu of this.ps.menus) {
      const mod = menu.modules.find((m: any) => m.route_path?.endsWith(`/${slug}`));
      if (mod?.route_path) return mod.route_path;
    }
    return `/dynamic/${slug}`;
  }

  get resourcePath(): string { return API.engineRecords.base(this.config?.slug ?? ''); }

  override ngOnInit(): void {
    const slug = this.embedMode ? this.embedSlug : (this.route.snapshot.params['slug'] as string);
    this.doctypeConfig.get(slug).subscribe({
      next: (doc) => {
        if (!doc) { this.notFound = true; this.configLoading = false; return; }
        this.config = doc;
        this.formFields = doc.fields ?? [];
        this.groupedSections = this.buildSections(this.formFields);
        this.form = this.buildForm();
        this.loadChildMetas();
        this.wireFieldIntelligence();
        this.configLoading = false;
        if (this.embedMode) {
          this.editId   = this.embedId ?? '';
          this.editMode = !!this.embedId;
          this.viewMode = this.embedViewMode;
          this.loadNamingSeriesPreviews();
          if (this.embedId) {
            this.loading = true;
            this.cs.getService({ url: `${this.resourcePath}/${this.embedId}` }).subscribe({
              next: (res: any) => { this.loading = false; this.onRecordLoaded(res?.data ?? res); this.cdr.detectChanges(); },
              error: () => { this.loading = false; this.cdr.detectChanges(); },
            });
          }
        } else {
          this.detectModeAndLoad();
          this.loadNamingSeriesPreviews();
        }
      },
      error: () => { this.notFound = true; this.configLoading = false; },
    });
  }

  protected buildForm(): FormGroup {
    const group: Record<string, FormControl> = {};

    if (this.config?.is_location_scoped) {
      const preferred = this.locationCtx.preferredLocationId();
      group['location_id'] = new FormControl(preferred ?? '', Validators.required);
    }

    for (const field of this.formFields) {
      if (['address', 'file', 'relation-widget', 'child-table', 'naming-series'].includes(field.field_type)) continue;
      if (this.config?.is_location_scoped && field.field_name === 'location_id') continue;
      const v = field.validators ?? {};
      const syncValidators = [];
      if (v.required)                     syncValidators.push(Validators.required);
      if (v.min != null)                  syncValidators.push(Validators.minLength(v.min));
      if (v.max != null)                  syncValidators.push(Validators.maxLength(v.max));
      if (field.field_type === 'email')   syncValidators.push(Validators.email);
      const defaultVal = field.default_value ?? (field.field_type === 'checkbox' ? false : field.field_type === 'phone' ? { code: '+91', number: '' } : '');
      group[field.field_name] = new FormControl(
        field.field_type === 'checkbox' && field.default_value === 'true' ? true : defaultVal,
        syncValidators
      );
    }
    return new FormGroup(group);
  }

  protected override onRecordLoaded(data: any): void {
    const patch: Record<string, any> = {};

    if (this.config?.is_location_scoped && data.location_id) {
      patch['location_id'] = data.location_id;
      const loc = this.locationCtx.permitted().find(l => l.id === data.location_id);
      if (loc) this.recordLocation.set(loc);
    }

    for (const field of this.formFields) {
      if (field.field_type === 'address') {
        this.addressData[field.field_name] = data.addresses ?? [];
        continue;
      }
      if (field.field_type === 'file') {
        this.uploadedFiles[field.field_name] = data[field.field_name] ?? null;
        continue;
      }
      if (field.field_type === 'relation-widget') {
        // RelationWidget loads its own data using parentId — handled via ngOnChanges in the widget
        continue;
      }
      if (field.field_type === 'child-table') {
        // ChildTableComponent loads its own rows via API when parentId is set
        continue;
      }
      if (field.field_type === 'naming-series') {
        this.namingSeriesValues[field.field_name] = data[field.field_name] ?? '';
        continue;
      }
      if (field.field_type === 'phone') {
        patch[field.field_name] = { code: data[`${field.field_name}_code`] || '+91', number: data[field.field_name] || '' };
        continue;
      }
      if (field.field_type === 'async-select') {
        const relKey = field.field_name.replace('_id', '');
        const rel = data[relKey];
        if (rel?.name) this.initialLabels[field.field_name] = rel.name;
        patch[field.field_name] = data[field.field_name] ?? rel?.id ?? '';
        continue;
      }
      if (data[field.field_name] !== undefined) {
        patch[field.field_name] = data[field.field_name];
      }
    }
    this.form.patchValue(patch);
    this.workflowState = data.workflow_state ?? null;
    // Re-evaluate depends_on with loaded values
    this.evaluateAllConditions();
    this.cdr.markForCheck();
    if (this.workflowState) this.loadWorkflowActions();
  }

  protected override beforeSubmit(): boolean {
    let valid = true;
    for (const field of this.formFields) {
      if (field.field_type === 'address' && field.validators?.required) {
        const addrs = this.addressData[field.field_name] ?? [];
        if (addrs.length === 0) {
          this.addressErrors[field.field_name] = `${field.field_label} requires at least one address`;
          valid = false;
        }
      }
      if (field.field_type === 'relation-widget' && field.validators?.required) {
        const widget = this.relationWidgets?.find(w => w.fieldName === field.field_name);
        if (widget && !widget.isValid()) {
          this.relationErrors[field.field_name] = `${field.field_label} — please select at least one`;
          valid = false;
        }
      }
    }
    return valid;
  }

  protected override toPayload(): any {
    const val = this.form.value;
    const data: any = { ...val };

    for (const field of this.formFields) {
      if (field.field_type === 'phone') {
        const phone = val[field.field_name];
        data[`${field.field_name}_code`] = phone?.code || '+91';
        data[field.field_name] = phone?.number || null;
      }
      if (field.field_type === 'address') {
        data[field.field_name] = this.addressData[field.field_name] ?? [];
      }
      if (field.field_type === 'file') {
        const comp = this.fileUploads?.find(c => c.fieldKey === field.field_name);
        const pending = comp?.pendingFileData ?? null;
        if (pending) {
          data[field.field_name] = pending;
        } else {
          delete data[field.field_name];
        }
      }
      // relation-widget, child-table, and naming-series are not part of the payload from the form
      if (field.field_type === 'relation-widget' || field.field_type === 'child-table' || field.field_type === 'naming-series') {
        delete data[field.field_name];
      }
    }
    return data;
  }

  protected override afterSave(res: any): void {
    this.fileUploads?.forEach(c => c.clearPending());
    const savedId = res?.data?.id ?? this.editId;
    Promise.all([
      this.saveRelationWidgets(savedId),
      this.pushBufferedChildRows(savedId),
    ]).then(() => {
      this.saving = false;
      this.cs.showToastr({ type: 'success', message: 'Saved successfully' });
      if (this.embedMode) {
        this.saved.emit();
      } else {
        this.cs.navigate({ url: this.listRoute });
      }
    });
  }

  private loadNamingSeriesPreviews(): void {
    if (this.editMode || this.viewMode) return;
    const nsFields = this.formFields.filter(f => f.field_type === 'naming-series');
    for (const f of nsFields) {
      const locationId = this.form.get('location_id')?.value;
      this.cs.getService({ url: API.engineRecords.namingSeriesPreview(this.config!.slug, f.field_name, locationId || undefined) }).subscribe({
        next: (res: any) => {
          this.namingSeriesPreviews[f.field_name] = res?.data?.preview ?? 'Auto-generated';
          this.cdr.markForCheck();
        },
      });
    }
  }

  private loadChildMetas(): void {
    const childFields = this.formFields.filter(f => f.field_type === 'child-table' && f.ref_doctype_slug);
    for (const f of childFields) {
      this.doctypeConfig.get(f.ref_doctype_slug!).subscribe({
        next: (doc) => {
          if (doc) {
            this.childMetas[f.field_name] = {
              slug: doc.slug,
              label: doc.label,
              fields: doc.fields.map(cf => ({
                field_name: cf.field_name,
                field_label: cf.field_label,
                field_type: cf.field_type,
                is_required: !!cf.validators?.required,
                show_in_list: cf.show_in_list,
                validators: cf.validators,
                select_options: cf.select_options,
                ref_doctype_slug: cf.ref_doctype_slug ?? undefined,
                col_span: cf.col_span,
              })),
            };
          }
        },
      });
    }
  }

  private async pushBufferedChildRows(parentId: string): Promise<void> {
    if (!parentId || this.editMode) return;
    const childFields = this.formFields.filter(f => f.field_type === 'child-table' && f.ref_doctype_slug);
    for (const f of childFields) {
      const rows = this.childRows[f.field_name] ?? [];
      if (rows.length === 0) continue;
      await lastValueFrom(this.cs.postService({
        url: API.engineChildRecords.replace(this.config!.slug, parentId, f.field_name),
        payload: { rows },
      })).catch(() => {});
    }
  }

  onChildRowsChange(fieldName: string, rows: any[]): void {
    this.childRows[fieldName] = rows;
  }

  isChildTableField(f: FieldDef): boolean { return f.field_type === 'child-table'; }
  getChildMeta(f: FieldDef): ChildDocTypeMeta | null { return this.childMetas[f.field_name] ?? null; }

  override ngOnDestroy(): void {
    this._fieldSubs.forEach(s => s.unsubscribe());
  }

  // Called once after form is built and config is loaded
  private wireFieldIntelligence(): void {
    this._fieldSubs.forEach(s => s.unsubscribe());
    this._fieldSubs = [];

    // Initial evaluation of all depends_on conditions
    this.evaluateAllConditions();

    for (const field of this.formFields) {

      // ── depends_on ────────────────────────────────────────────────────
      // If any field referenced in the expression changes, re-evaluate
      if (field.depends_on) {
        const watchFields = this.extractDocFields(field.depends_on);
        for (const watchName of watchFields) {
          const ctrl = this.form.get(watchName);
          if (!ctrl) continue;
          const sub = ctrl.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
            this.evaluateAllConditions();
            this.cdr.markForCheck();
          });
          this._fieldSubs.push(sub);
        }
      }

      // ── fetch_from ────────────────────────────────────────────────────
      // Format: "linked_field_name.source_field"  e.g. "student_id.full_name"
      if (field.fetch_from) {
        const dotIdx = field.fetch_from.indexOf('.');
        if (dotIdx > 0) {
          const linkedFieldName = field.fetch_from.substring(0, dotIdx);
          const sourceField = field.fetch_from.substring(dotIdx + 1);
          const linkedCtrl = this.form.get(linkedFieldName);
          if (linkedCtrl) {
            const sub = linkedCtrl.valueChanges.pipe(distinctUntilChanged()).subscribe((linkedId: string) => {
              if (!linkedId) {
                this.form.get(field.field_name)?.setValue(null, { emitEvent: false });
                return;
              }
              // Find the ref_doctype_slug of the linked field
              const linkedFieldDef = this.formFields.find(f => f.field_name === linkedFieldName);
              const refSlug = linkedFieldDef?.ref_doctype_slug;
              if (!refSlug) return;

              this.cs.getService({
                url: API.engineRecords.fetchFields(refSlug, linkedId, [sourceField]),
              }).subscribe({
                next: (res: any) => {
                  const val = res?.data?.[sourceField] ?? null;
                  this.form.get(field.field_name)?.setValue(val, { emitEvent: false });
                  this.cdr.markForCheck();
                },
              });
            });
            this._fieldSubs.push(sub);
          }
        }
      }
    }
  }

  private evaluateAllConditions(): void {
    const doc = this.form.value;
    for (const field of this.formFields) {
      if (!field.depends_on) continue;
      const visible = this.evalExpression(field.depends_on, doc);
      if (visible) {
        this.hiddenByCondition.delete(field.field_name);
      } else {
        this.hiddenByCondition.add(field.field_name);
      }
    }
  }

  private evalExpression(expr: string, doc: any): boolean {
    try {
      // Safe evaluation: only expose `doc` variable
      // eslint-disable-next-line no-new-func
      return !!new Function('doc', `return !!(${expr})`)(doc);
    } catch {
      return true; // show by default if expression is invalid
    }
  }

  // Extract all "doc.fieldName" references from an expression string
  private extractDocFields(expr: string): string[] {
    const matches = expr.matchAll(/doc\.([a-z_][a-z0-9_]*)/gi);
    return [...new Set([...matches].map(m => m[1]))];
  }

  isHiddenByCondition(f: FieldDef): boolean {
    return this.hiddenByCondition.has(f.field_name);
  }

  private async saveRelationWidgets(parentId: string): Promise<void> {
    if (!parentId) return;
    const relFields = this.formFields.filter(f => f.field_type === 'relation-widget');
    for (const field of relFields) {
      const widget = this.getRelationWidget(field.field_name);
      if (!widget) continue;
      const cfg = this.getRelationConfig(field);
      const rows = widget.getSelectedRows();
      const isMatrix = cfg.displayStyle === 'matrix';
      await lastValueFrom(this.cs.postService({
        url: API.engineRelations.save(cfg.junctionTable, parentId),
        payload: isMatrix
          ? { parentKey: cfg.parentKey, childKey: cfg.childKey, crossKey: cfg.crossKey, rows }
          : { parentKey: cfg.parentKey, childKey: cfg.childKey, extraColumns: cfg.extraColumns ?? {}, rows },
      }));
    }
  }

  private buildSections(fields: FieldDef[]): FieldSection[] {
    const map = new Map<string, FieldDef[]>();
    for (const f of fields) {
      const key = f.section_name ?? '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return Array.from(map.entries()).map(([title, fs]) => ({ title, fields: fs }));
  }

  // ── Helpers ────────────────────────────────────────────────────────

  get locationFieldColSpan(): string {
    const f = this.formFields.find(f => f.field_name === 'location_id');
    return 'col-span-' + (f?.col_span ?? 6);
  }

  isNamingSeries(f: FieldDef): boolean { return f.field_type === 'naming-series'; }
  getNamingSeriesPreview(f: FieldDef): string { return this.namingSeriesPreviews[f.field_name] ?? 'Auto-generated'; }
  getNamingSeriesValue(f: FieldDef): string { return this.namingSeriesValues[f.field_name] ?? ''; }

  isStandardField(f: FieldDef): boolean {
    return !['address', 'file', 'relation-widget', 'child-table', 'naming-series'].includes(f.field_type)
      && !(this.config?.is_location_scoped && f.field_name === 'location_id')
      && !this.hiddenByCondition.has(f.field_name);
  }
  getFieldType(f: FieldDef): any { return f.field_type; }
  getTransform(f: FieldDef): string { return (f.validators as any)?.transform || ''; }
  getColSpan(f: FieldDef): string {
    if (f.field_type === 'address' || f.field_type === 'relation-widget' || f.field_type === 'child-table') {
      return 'col-span-12';
    }
    if (f.field_type === 'checkbox') return 'col-span-' + (f.col_span ?? 6) + ' flex items-center';
    return 'col-span-' + (f.col_span ?? 6);
  }
  getOptions(f: FieldDef): any[] { return Array.isArray(f.select_options) ? f.select_options : []; }
  getDropdownUrl(f: FieldDef): string {
    return f.field_type === 'async-select' && f.ref_doctype_slug
      ? `/engine/records/${f.ref_doctype_slug}/dropdown` : '';
  }
  getInitialLabel(name: string): string { return this.initialLabels[name] ?? ''; }
  isRequired(f: FieldDef): boolean { return !!f.validators?.required; }
  getFileField(name: string): UploadedFile | null { return this.uploadedFiles[name] ?? null; }
  getAddresses(name: string): Address[] { return this.addressData[name] ?? []; }

  getAddressTypes(f: FieldDef): SelectOption[] {
    const meta = f.select_options as any;
    if (!Array.isArray(meta?.addressTypes) || meta.addressTypes.length === 0) return ADDRESS_TYPE_OPTIONS;
    return ADDRESS_TYPE_OPTIONS.filter(o => meta.addressTypes.includes(o.value));
  }

  getFileDisplayStyle(f: FieldDef): 'avatar' | 'photo' | 'dropzone' {
    const meta = f.select_options as any;
    return meta?.displayStyle ?? 'dropzone';
  }
  getFileEntityType(f: FieldDef): string {
    const meta = f.select_options as any;
    return meta?.entityType ?? (this.config?.slug ?? '');
  }
  getFileType(f: FieldDef): string {
    const meta = f.select_options as any;
    return meta?.fileType ?? 'document';
  }

  getRelationConfig(f: FieldDef): RelationWidgetConfig {
    const meta = f.select_options as any ?? {};
    return {
      sourceTable:        meta.sourceTable        ?? '',
      junctionTable:      meta.junctionTable      ?? '',
      parentKey:          meta.parentKey          ?? '',
      childKey:           meta.childKey           ?? '',
      extraColumns:       meta.extraColumns       ?? {},
      orderColumn:        meta.orderColumn        ?? undefined,
      displayStyle:       meta.displayStyle       ?? 'checkbox',
      displayFields:      meta.displayFields      ?? { label: 'name', sub: 'code' },
      crossTable:         meta.crossTable         ?? '',
      crossKey:           meta.crossKey           ?? '',
      crossDisplayFields: meta.crossDisplayFields ?? { label: 'name' },
    };
  }
  getRelationParentId(_f: FieldDef): string { return this.editId || ''; }
  getRelationError(name: string): string { return this.relationErrors[name] ?? ''; }
  getRelationWidget(fieldName: string): RelationWidgetComponent | undefined {
    return this.relationWidgets?.find(w => w.fieldName === fieldName);
  }

  private isVisible(f: FieldDef): boolean {
    return !f.is_hidden && !this.hiddenByCondition.has(f.field_name);
  }
  sectionHasFileField(section: FieldSection): boolean {
    return section.fields.some(f => f.field_type === 'file' && this.isVisible(f));
  }
  sectionNonFileFields(section: FieldSection): FieldDef[] {
    return section.fields.filter(f => f.field_type !== 'file' && this.isVisible(f));
  }
  sectionFileFields(section: FieldSection): FieldDef[] {
    return section.fields.filter(f => f.field_type === 'file' && this.isVisible(f));
  }
  sectionIsAddressOnly(section: FieldSection): boolean {
    const visible = section.fields.filter(f => this.isVisible(f));
    return visible.length > 0 && visible.every(f => f.field_type === 'address');
  }
  sectionIsRelationOnly(section: FieldSection): boolean {
    const visible = section.fields.filter(f => this.isVisible(f));
    return visible.length > 0 && visible.every(f => f.field_type === 'relation-widget');
  }

  onAddressesChange(name: string, addresses: Address[]): void {
    this.addressData[name] = addresses;
    if (addresses.length > 0) delete this.addressErrors[name];
  }
  onRelationChange(name: string): void {
    delete this.relationErrors[name];
  }

  override cancel(): void {
    if (this.embedMode) {
      this.cancelled.emit();
    } else {
      super.cancel();
    }
  }

  private loadWorkflowActions(): void {
    if (!this.config || !this.editId) return;
    this.cs.getService({ url: API.engineWorkflow.actions(this.config.slug, this.editId) }).subscribe({
      next: (res: any) => {
        this.workflowActions = res?.data ?? [];
        this.cdr.markForCheck();
      },
      error: () => { this.workflowActions = []; },
    });
  }

  doTransition(action: { action_label: string; to_state: string }): void {
    if (!this.config || !this.editId) return;
    this.transitioningAction = action.action_label;
    this.cs.postService({
      url: API.engineWorkflow.transition(this.config.slug, this.editId),
      payload: { action_label: action.action_label },
    }).subscribe({
      next: (res: any) => {
        this.transitioningAction = null;
        this.workflowState = res?.data?.workflow_state ?? action.to_state;
        this.cs.showToastr({ type: 'success', message: `State changed to "${this.workflowState}"` });
        this.loadWorkflowActions();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.transitioningAction = null;
        this.cs.showToastr({ type: 'error', message: err?.error?.message || 'Transition failed' });
        this.cdr.markForCheck();
      },
    });
  }

  getWorkflowStateBadgeClass(state: string): string {
    // Simple color mapping based on common state names
    const lower = state.toLowerCase();
    if (['approved', 'active', 'completed', 'published'].some(k => lower.includes(k))) return 'bg-green-100 text-green-700';
    if (['rejected', 'cancelled', 'failed', 'closed'].some(k => lower.includes(k))) return 'bg-red-100 text-red-700';
    if (['pending', 'review', 'submitted'].some(k => lower.includes(k))) return 'bg-yellow-100 text-yellow-700';
    if (['draft'].some(k => lower.includes(k))) return 'bg-gray-100 text-gray-700';
    return 'bg-blue-100 text-blue-700';
  }

  printRecord(): void {
    if (!this.config || !this.editId) return;
    this.cs.getService({ url: API.enginePrintFormats.list(this.config.slug) }).subscribe({
      next: (res: any) => {
        const formats: any[] = res?.data ?? [];
        if (formats.length === 0) {
          this.cs.showToastr({ type: 'error', message: 'No print formats configured for this DocType.' });
          return;
        }
        const def = formats.find(f => f.is_default) ?? formats[0];
        const url = API.enginePrintFormats.render(this.config!.slug, def.id, this.editId!);
        this.cs.getService({ url }).subscribe({
          next: (r: any) => {
            const html: string = r?.data?.html ?? '';
            const win = window.open('', '_blank');
            if (win) {
              win.document.write(html);
              win.document.close();
              win.focus();
              setTimeout(() => win.print(), 500);
            }
          },
        });
      },
    });
  }

  /** Called by the modal footer buttons when in embedMode */
  submitForm(): void { this.onSubmit(); }
  switchToEditMode(): void {
    if (this.embedMode) {
      this.viewMode = false;
      this.editMode = true;
      this.cdr.detectChanges();
    } else {
      this.switchToEdit();
    }
  }
  get isViewMode(): boolean { return this.viewMode; }
  get isSaving(): boolean { return this.saving; }
  get isEditMode(): boolean { return this.editMode; }
}
