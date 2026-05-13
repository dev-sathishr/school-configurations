import { ChangeDetectorRef, Component, inject, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TableComponent } from '../../../shared/components/table/table.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { CommonService } from '../../../shared/services/common/common.service';
import { PermissionService } from '../../../core/services/permission.service';
import { LocationContextService } from '../../../core/services/location-context.service';
import { DoctypeConfigService, DoctypeConfig } from '../doctype-config.service';
import { API } from '../../../core/api/endpoints';
import { statusLabel, STATUS_BADGES } from '../../../core/constants/enums';
import { ColumnConfig } from '../../../shared/components/table/services/table-filter.service';

@Component({
  selector: 'app-dynamic-page-list',
  template: `
    @if (loading) { <app-loader size="large" text="Loading..." /> }

    @if (!loading && config) {
      @if (!embedded) {
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <app-breadcrumb />
          <app-button *appHasPermission="[moduleCode, 'CREATE']"
            impact="bold" tone="primary" shape="rounded" size="medium"
            (buttonClick)="addNew()">
            <span class="flex items-center gap-1.5">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-base font-bold leading-none">+</span>
              Add {{ config!.label }}
            </span>
          </app-button>
        </div>
      }
      <app-table
        [apiUrl]="apiUrl" [deleteUrl]="deleteUrl"
        [columns]="columns" [displayKeyMap]="displayKeyMap" [rowTransform]="rowTransform"
        [extraParams]="config!.is_location_scoped ? locationCtx.scopeExtraParams() : {}"
        [canEdit]="ps.canEdit(moduleCode)" [canDelete]="ps.canDelete(moduleCode)"
        [canView]="ps.canView(moduleCode)" [canImport]="ps.canImport(moduleCode)"
        [canExport]="ps.canExport(moduleCode)"
        (onEdit)="editSelected($event)" (onView)="viewSelected($event)" />
    }

    @if (!loading && notFound) {
      @if (!embedded) { <div class="mb-6"><app-breadcrumb /></div> }
      <div class="flex h-64 items-center justify-center text-muted-foreground">Module not found.</div>
    }
  `,
  imports: [CommonModule, TableComponent, ButtonComponent, BreadcrumbComponent,
    LoaderComponent, HasPermissionDirective],
})
export class DynamicPageListComponent implements OnInit {
  @Input() slugOverride = '';
  @Input() moduleCodeOverride = '';
  @Input() embedded = false;

  @ViewChild(TableComponent) table!: TableComponent;

  private readonly route         = inject(ActivatedRoute);
  private readonly cdr           = inject(ChangeDetectorRef);
  protected readonly cs          = inject(CommonService);
  readonly ps                    = inject(PermissionService);
  readonly locationCtx           = inject(LocationContextService);
  private readonly doctypeConfig = inject(DoctypeConfigService);

  config: DoctypeConfig | null = null;
  loading    = true;
  notFound   = false;
  columns: ColumnConfig[]               = [];
  displayKeyMap: Record<string, string> = {};
  apiUrl     = '';
  deleteUrl  = '';
  moduleCode = '';

  private phoneFields: string[]       = [];
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
      .filter((f: any) => f.show_in_list && !f.is_hidden && f.field_name !== 'is_active')
      .sort((a: any, b: any) => a.display_order - b.display_order);

    const avatarFileField = fields.find((f: any) => {
      if (f.field_type !== 'file' || !f.show_in_list || f.is_hidden) return false;
      const meta = f.select_options || {};
      return meta.displayStyle === 'avatar' || meta.displayStyle === 'photo';
    });
    const firstTextField = visibleFields.find((f: any) => f.field_type !== 'file' && f.field_type !== 'address');

    this.columns = visibleFields
      .filter((f: any) => f.field_type !== 'file' && f.field_type !== 'address')
      .map((f: any) => {
        const key = f.field_type === 'async-select' ? `${f.field_name}_name` : f.field_name;
        const col: ColumnConfig = { key, label: f.field_label,
          sortable: f.field_type !== 'async-select' && f.field_type !== 'phone',
          searchable: f.is_searchable };
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
    for (const name of this.phoneFields)
      mapped[name] = row[name] ? `${row[`${name}_code`] || '+91'} ${row[name]}` : '-';
    for (const name of this.asyncSelectFields)
      mapped[`${name}_name`] = row[`${name}_name`] || '-';
    for (const key of Object.keys(row))
      if (key.endsWith('_file_id')) mapped[key] = row[key];
    return mapped;
  };

  private get routeBase(): string {
    const slug = this.config?.slug;
    for (const menu of this.ps.menus) {
      const mod = menu.modules.find((m: any) => m.route_path?.endsWith(`/${slug}`));
      if (mod?.route_path) return mod.route_path;
    }
    return `/dynamic/${slug}`;
  }

  addNew(): void { this.cs.navigate({ url: `${this.routeBase}/new` }); }
  editSelected(row: { id: string }): void { this.cs.navigate({ url: `${this.routeBase}/${row.id}/edit` }); }
  viewSelected(row: { id: string }): void { this.cs.navigate({ url: `${this.routeBase}/${row.id}/view` }); }
}
