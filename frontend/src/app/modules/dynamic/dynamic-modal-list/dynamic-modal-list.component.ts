import { ChangeDetectorRef, Component, inject, Input, OnInit, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TableComponent } from '../../../shared/components/table/table.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { CommonService } from '../../../shared/services/common/common.service';
import { PermissionService } from '../../../core/services/permission.service';
import { LocationContextService } from '../../../core/services/location-context.service';
import { DoctypeConfigService, DoctypeConfig } from '../doctype-config.service';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';
import { API } from '../../../core/api/endpoints';
import { statusLabel, STATUS_BADGES } from '../../../core/constants/enums';
import { ColumnConfig } from '../../../shared/components/table/services/table-filter.service';

@Component({
  selector: 'app-dynamic-modal-list',
  templateUrl: './dynamic-modal-list.component.html',
  imports: [CommonModule, TableComponent, ButtonComponent, BreadcrumbComponent,
    LoaderComponent, ModalComponent, DynamicFormComponent, HasPermissionDirective],
})
export class DynamicModalListComponent implements OnInit {
  @Input() slugOverride = '';        // set by tab-group to bypass route param
  @Input() moduleCodeOverride = '';  // set by tab-group to use parent module permissions
  @Input() embedded = false;         // hide breadcrumb when inside a tab-group
  @ViewChild(TableComponent) table!: TableComponent;
  @ViewChild('embedForm') embedForm: DynamicFormComponent | undefined;

  private readonly route         = inject(ActivatedRoute);
  private readonly cdr           = inject(ChangeDetectorRef);
  protected readonly cs          = inject(CommonService);
  readonly ps                    = inject(PermissionService);
  readonly locationCtx           = inject(LocationContextService);
  private readonly doctypeConfig = inject(DoctypeConfigService);

  config: DoctypeConfig | null = null;
  loading   = true;
  notFound  = false;

  columns: ColumnConfig[]            = [];
  displayKeyMap: Record<string, string> = {};
  apiUrl    = '';
  deleteUrl = '';
  moduleCode = '';

  // Modal state
  modalVisible  = false;
  modalEditId: string | null = null;
  modalViewMode = false;

  get modalTitle(): string {
    if (!this.config) return '';
    if (this.modalViewMode)         return `View ${this.config.label}`;
    if (this.modalEditId)           return `Edit ${this.config.label}`;
    return `New ${this.config.label}`;
  }

  get modalSize(): 'small' | 'medium' | 'large' | 'full' {
    const s = this.config?.modal_size ?? 'medium';
    return s === 'xlarge' ? 'full' : s as any;
  }

  private phoneFields: string[]      = [];
  private asyncSelectFields: string[] = [];

  ngOnInit(): void {
    const slug = this.slugOverride || (this.route.snapshot.params['slug'] as string);
    this.moduleCode = this.moduleCodeOverride || slug.toUpperCase().replace(/-/g, '_');
    this.doctypeConfig.get(slug).subscribe({
      next: (doc) => {
        if (!doc) { this.notFound = true; this.loading = false; this.cdr.detectChanges(); return; }
        this.config    = doc;
        this.apiUrl    = API.engineRecords.base(slug);
        this.deleteUrl = API.engineRecords.deleteMultiple(slug);
        this.buildColumns(doc.fields ?? []);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.notFound = true; this.loading = false; this.cdr.detectChanges(); },
    });
  }

  private buildColumns(fields: any[]): void {
    this.phoneFields       = fields.filter(f => f.field_type === 'phone'        && f.show_in_list && !f.is_hidden).map(f => f.field_name);
    this.asyncSelectFields = fields.filter(f => f.field_type === 'async-select' && f.show_in_list && !f.is_hidden).map(f => f.field_name);

    const visibleFields = fields
      .filter(f => f.show_in_list && !f.is_hidden && f.field_name !== 'is_active')
      .sort((a, b) => a.display_order - b.display_order);

    const avatarFileField = fields.find(f => {
      if (f.field_type !== 'file' || !f.show_in_list || f.is_hidden) return false;
      const meta = f.select_options || {};
      return meta.displayStyle === 'avatar' || meta.displayStyle === 'photo';
    });
    const firstTextField = visibleFields.find(f => f.field_type !== 'file' && f.field_type !== 'address');

    this.columns = visibleFields
      .filter(f => f.field_type !== 'file' && f.field_type !== 'address')
      .map(f => {
        const key = f.field_type === 'async-select' ? `${f.field_name}_name` : f.field_name;
        const col: ColumnConfig = { key, label: f.field_label, sortable: f.field_type !== 'async-select' && f.field_type !== 'phone', searchable: f.is_searchable };
        if (avatarFileField && firstTextField && f.field_name === firstTextField.field_name) {
          col.type = 'avatar'; col.avatarKey = `${avatarFileField.field_name}_file_id`;
        }
        return col;
      });

    this.columns.push({ key: 'is_active', label: 'Status', type: 'badge', badgeMap: STATUS_BADGES });

    this.displayKeyMap = {};
    for (const col of this.columns) this.displayKeyMap[col.key] = col.key;
    if (avatarFileField) {
      const k = `${avatarFileField.field_name}_file_id`;
      this.displayKeyMap[k] = k;
    }
  }

  rowTransform = (row: any, mapped: any) => {
    mapped['is_active'] = statusLabel(row.is_active);
    for (const name of this.phoneFields) {
      mapped[name] = row[name] ? `${row[`${name}_code`] || '+91'} ${row[name]}` : '-';
    }
    for (const name of this.asyncSelectFields) {
      mapped[`${name}_name`] = row[`${name}_name`] || '-';
    }
    for (const key of Object.keys(row)) {
      if (key.endsWith('_file_id')) mapped[key] = row[key];
    }
    return mapped;
  };

  openNew(): void {
    this.modalEditId  = null;
    this.modalViewMode = false;
    this.modalVisible  = true;
  }

  openEdit(row: { id: string }): void {
    this.modalEditId   = row.id;
    this.modalViewMode = false;
    this.modalVisible  = true;
  }

  openView(row: { id: string }): void {
    this.modalEditId   = row.id;
    this.modalViewMode = true;
    this.modalVisible  = true;
  }

  closeModal(): void {
    this.modalVisible = false;
    this.modalEditId  = null;
    this.cdr.detectChanges();
  }

  onModalSaved(): void {
    this.modalVisible = false;
    this.modalEditId  = null;
    this.table?.reloadCurrentPage();
    this.cdr.detectChanges();
  }

  get formIsViewMode(): boolean  { return this.embedForm?.isViewMode  ?? false; }
  get formIsEditMode(): boolean  { return this.embedForm?.isEditMode  ?? false; }
  get formIsSaving():  boolean   { return this.embedForm?.isSaving    ?? false; }
  formSubmit():        void      { this.embedForm?.submitForm(); }
  formSwitchToEdit():  void      { this.modalViewMode = false; this.embedForm?.switchToEditMode(); this.cdr.detectChanges(); }
}
