import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonService } from '../../services/common/common.service';
import { API } from '../../../core/api/endpoints';

export interface RelationItem {
  id: string;
  label: string;
  sub: string;
  selected: boolean;
  is_default?: boolean;
  permissions?: Record<string, boolean>;
  [key: string]: any;
}

export interface RelationWidgetConfig {
  sourceTable: string;
  junctionTable: string;
  parentKey: string;
  childKey: string;
  extraColumns?: Record<string, boolean>;
  orderColumn?: string;
  displayStyle?: 'checkbox' | 'matrix';
  displayFields?: { label: string; sub: string };
  crossTable?: string;
  crossKey?: string;
  crossDisplayFields?: { label: string };
}

interface CrossItem { id: string; label: string; }
interface MatrixGroup { menuId: string; menuLabel: string; menuCode: string; rows: RelationItem[]; }

@Component({
  selector: 'app-relation-widget',
  imports: [CommonModule],
  template: `
    <div>
      @if (helpText) {
        <p class="text-muted-foreground mb-3 text-xs">{{ helpText }}</p>
      }

      @if (loading) {
        <div class="text-muted-foreground py-4 text-sm">Loading...</div>
      }

      <!-- ── Checkbox style ── -->
      @if (!loading && isCheckbox) {
        @if (items.length === 0) {
          <div class="border-muted/30 rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
            No items available.
          </div>
        } @else {
          <div [class]="hasOrder ? 'flex flex-col gap-1.5' : 'grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3'">
            @for (item of items; track item.id) {
              <div class="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors"
                [class.border-primary]="item.selected"
                [class.bg-primary/5]="item.selected"
                [class.border-muted/30]="!item.selected"
                [class.opacity-60]="readonly">
                <input type="checkbox" class="accent-primary h-4 w-4 flex-shrink-0 cursor-pointer"
                  [checked]="item.selected" [disabled]="readonly"
                  (change)="toggleItem(item, $any($event.target).checked)" />
                <div class="min-w-0 flex-1 cursor-pointer" (click)="readonly ? null : toggleItem(item, !item.selected)">
                  <span class="text-foreground text-sm font-medium">{{ item.label }}</span>
                  @if (item.sub) { <span class="text-muted-foreground ml-1 text-xs">({{ item.sub }})</span> }
                </div>
                @if (hasDefault && item.selected) {
                  <button type="button"
                    class="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors"
                    [class.bg-primary]="item.is_default"
                    [class.text-primary-foreground]="item.is_default"
                    [class.bg-muted/30]="!item.is_default"
                    [class.text-muted-foreground]="!item.is_default"
                    [disabled]="readonly" (click)="setDefault(item)">
                    {{ item.is_default ? 'Default' : 'Set default' }}
                  </button>
                }
                @if (hasOrder && item.selected) {
                  <div class="flex flex-shrink-0 items-center gap-2">
                    <span class="text-muted-foreground text-xs">Order</span>
                    <input type="number" min="0"
                      class="border-muted bg-background text-foreground w-16 rounded border px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      [value]="getOrder(item)"
                      [disabled]="readonly"
                      (change)="setOrder(item, $any($event.target).valueAsNumber)" />
                  </div>
                }
              </div>
            }
          </div>
        }
      }

      <!-- ── Matrix style (grouped by menu) ── -->
      @if (!loading && isMatrix) {
        @if (matrixGroups.length === 0) {
          <div class="border-muted/30 rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
            No items available.
          </div>
        } @else {
          <div class="space-y-3">
            @for (group of matrixGroups; track group.menuId) {
              <div class="border-muted/30 overflow-hidden rounded-lg border">

                <!-- Menu header -->
                <div class="flex items-center gap-3 px-4 py-3 transition-colors"
                  [class.bg-primary/5]="isGroupSelected(group)"
                  [class.bg-muted/20]="!isGroupSelected(group)">
                  <label class="flex flex-1 cursor-pointer items-center gap-3 select-none">
                    <input type="checkbox" class="accent-primary h-4 w-4"
                      [checked]="isGroupSelected(group)"
                      [indeterminate]="isGroupPartial(group)"
                      [disabled]="readonly"
                      (change)="toggleGroup(group, $any($event.target).checked)" />
                    <span class="text-foreground text-sm font-semibold">{{ group.menuLabel }}</span>
                  </label>
                  <span class="text-muted-foreground text-xs">{{ group.rows.length }} module{{ group.rows.length !== 1 ? 's' : '' }}</span>
                </div>

                <!-- Column headers + module rows -->
                <div class="border-muted/20 border-t">
                  <!-- Desktop header -->
                  <div class="text-muted-foreground bg-muted/10 hidden items-end px-4 py-2 text-xs font-medium sm:flex">
                    <div class="min-w-0 flex-1">Module</div>
                    <div class="flex shrink-0 items-end">
                      @for (cross of crossItems; track cross.id) {
                        <label class="flex w-[72px] cursor-pointer flex-col items-center gap-1 select-none">
                          <span>{{ cross.label }}</span>
                          <input type="checkbox" class="accent-primary h-4 w-4"
                            [checked]="isAllCheckedForGroupCross(group, cross.id)"
                            [disabled]="readonly"
                            (change)="toggleAllForGroupCross(group, cross.id)" />
                        </label>
                      }
                      <div class="w-[72px] text-center">All</div>
                    </div>
                  </div>

                  @for (item of group.rows; track item.id) {
                    <div class="border-muted/10 flex flex-col gap-2 border-t px-4 py-2 sm:flex-row sm:flex-nowrap sm:items-center">
                      <div class="min-w-0 flex-1">
                        <span class="text-foreground text-sm">{{ item.label }}</span>
                        @if (item.sub) {
                          <span class="text-muted-foreground ml-1 text-xs">({{ item.sub }})</span>
                        }
                      </div>
                      <div class="flex shrink-0 flex-wrap items-center sm:flex-nowrap">
                        @for (cross of crossItems; track cross.id) {
                          <label class="flex w-[72px] cursor-pointer items-center justify-center gap-1 rounded py-1.5 transition-colors select-none"
                            [class.bg-green-50]="item.permissions?.[cross.id]">
                            <input type="checkbox"
                              [checked]="item.permissions?.[cross.id]"
                              [disabled]="readonly"
                              class="accent-primary h-4 w-4"
                              (change)="togglePermission(item, cross.id)" />
                            <span class="text-xs sm:hidden">{{ cross.label }}</span>
                          </label>
                        }
                        <button type="button" [disabled]="readonly"
                          class="w-[72px] rounded py-1.5 text-center text-xs transition-colors"
                          [class.bg-primary/10]="isAllCheckedForRow(item)"
                          [class.text-primary]="isAllCheckedForRow(item)"
                          [class.bg-muted/30]="!isAllCheckedForRow(item)"
                          [class.text-muted-foreground]="!isAllCheckedForRow(item)"
                          (click)="toggleAllForRow(item)">
                          {{ isAllCheckedForRow(item) ? 'Clear' : 'All' }}
                        </button>
                      </div>
                    </div>
                  }
                </div>

              </div>
            }
          </div>
        }
      }

      @if (errorMessage) {
        <p class="mt-1.5 text-xs text-red-500">{{ errorMessage }}</p>
      }
    </div>
  `,
})
export class RelationWidgetComponent implements OnInit, OnChanges {
  @Input() config!: RelationWidgetConfig;
  @Input() fieldName = '';
  @Input() parentId: string = '';
  @Input() helpText = '';
  @Input() required = false;
  @Input() readonly = false;
  @Input() errorMessage = '';

  @Output() valueChange = new EventEmitter<RelationItem[]>();

  items: RelationItem[] = [];
  matrixGroups: MatrixGroup[] = [];
  crossItems: CrossItem[] = [];
  loading = false;

  get isCheckbox(): boolean { return this.config?.displayStyle !== 'matrix'; }
  get isMatrix(): boolean { return this.config?.displayStyle === 'matrix'; }
  get hasDefault(): boolean { return !!(this.config?.extraColumns?.['is_default']); }
  get hasOrder(): boolean { return !!this.config?.orderColumn; }
  get orderColumn(): string | undefined { return this.config?.orderColumn; }

  constructor(private cs: CommonService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.loadItems(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['parentId'] && !changes['parentId'].firstChange) this.loadItems();
  }

  private loadItems(): void {
    if (!this.config) return;
    this.isMatrix ? this.loadMatrix() : this.loadCheckbox();
  }

  private loadCheckbox(): void {
    this.loading = true;
    const { junctionTable, parentKey, childKey, sourceTable, extraColumns, displayFields, orderColumn } = this.config;
    const mergedExtras: Record<string, any> = { ...(extraColumns || {}) };
    if (orderColumn) mergedExtras[orderColumn] = 0;
    const url = API.engineRelations.get(junctionTable, this.parentId || '__new__');
    const params = {
      parentKey, childKey, sourceTable,
      extraColumns: JSON.stringify(mergedExtras),
      displayFields: JSON.stringify(displayFields || {}),
    };
    this.cs.getService({ url, params }).subscribe({
      next: (res: any) => { this.items = res?.data ?? []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  private loadMatrix(): void {
    this.loading = true;
    const { junctionTable, parentKey, childKey, crossKey, sourceTable, crossTable, displayFields, crossDisplayFields } = this.config;
    const url = API.engineRelations.matrix(junctionTable, this.parentId || '__new__');
    const params = {
      parentKey, childKey,
      crossKey: crossKey || '',
      sourceTable,
      crossTable: crossTable || '',
      displayFields: JSON.stringify(displayFields || {}),
      crossDisplayFields: JSON.stringify(crossDisplayFields || {}),
    };
    this.cs.getService({ url, params }).subscribe({
      next: (res: any) => {
        const groups: any[] = res?.groups ?? res?.data?.groups ?? [];
        this.matrixGroups = groups.map(g => ({
          ...g,
          rows: (g.rows || []).map((r: any) => ({ ...r, selected: Object.values(r.permissions || {}).some(Boolean) })),
        }));
        this.crossItems = res?.crossItems ?? res?.data?.crossItems ?? [];
        this.items = this.matrixGroups.flatMap(g => g.rows);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  // ── Checkbox helpers ──────────────────────────────────────────────

  toggleItem(item: RelationItem, checked: boolean): void {
    item.selected = checked;
    if (!checked) {
      item.is_default = false;
      if (!this.items.some(i => i.selected && i.is_default)) {
        const first = this.items.find(i => i.selected);
        if (first) first.is_default = true;
      }
    } else if (this.hasDefault && !this.items.some(i => i.is_default)) {
      item.is_default = true;
    }
    this.emit();
  }

  setDefault(item: RelationItem): void {
    if (this.readonly) return;
    this.items.forEach(i => { i.is_default = false; });
    item.is_default = true;
    this.emit();
  }

  getOrder(item: RelationItem): number {
    return this.orderColumn ? (item[this.orderColumn] ?? 0) : 0;
  }

  setOrder(item: RelationItem, value: number): void {
    if (this.readonly || !this.orderColumn) return;
    item[this.orderColumn] = isNaN(value) ? 0 : value;
    this.emit();
  }

  // ── Matrix group helpers ──────────────────────────────────────────

  isGroupSelected(group: MatrixGroup): boolean {
    return group.rows.length > 0 && group.rows.every(r => Object.values(r.permissions || {}).some(Boolean));
  }

  isGroupPartial(group: MatrixGroup): boolean {
    const any = group.rows.some(r => Object.values(r.permissions || {}).some(Boolean));
    return any && !this.isGroupSelected(group);
  }

  toggleGroup(group: MatrixGroup, checked: boolean): void {
    for (const row of group.rows) {
      for (const cross of this.crossItems) {
        if (!row.permissions) row.permissions = {};
        row.permissions[cross.id] = checked;
      }
      row.selected = checked;
    }
    this.emit();
  }

  isAllCheckedForGroupCross(group: MatrixGroup, crossId: string): boolean {
    return group.rows.length > 0 && group.rows.every(r => r.permissions?.[crossId]);
  }

  toggleAllForGroupCross(group: MatrixGroup, crossId: string): void {
    const allChecked = this.isAllCheckedForGroupCross(group, crossId);
    for (const row of group.rows) {
      if (!row.permissions) row.permissions = {};
      row.permissions[crossId] = !allChecked;
      row.selected = Object.values(row.permissions).some(Boolean);
    }
    this.emit();
  }

  togglePermission(item: RelationItem, crossId: string): void {
    if (!item.permissions) item.permissions = {};
    item.permissions[crossId] = !item.permissions[crossId];
    item.selected = Object.values(item.permissions).some(Boolean);
    this.emit();
  }

  toggleAllForRow(item: RelationItem): void {
    const allChecked = this.isAllCheckedForRow(item);
    for (const cross of this.crossItems) {
      if (!item.permissions) item.permissions = {};
      item.permissions[cross.id] = !allChecked;
    }
    item.selected = !allChecked;
    this.emit();
  }

  isAllCheckedForRow(item: RelationItem): boolean {
    if (!item.permissions || this.crossItems.length === 0) return false;
    return this.crossItems.every(c => item.permissions![c.id]);
  }

  // ── Shared ────────────────────────────────────────────────────────

  getSelectedRows(): RelationItem[] {
    if (this.isMatrix) return this.items.filter(i => i.selected);
    return this.items.filter(i => i.selected).map(i => ({ ...i, [this.config.childKey]: i.id }));
  }

  isValid(): boolean {
    if (!this.required) return true;
    return this.items.some(i => i.selected);
  }

  private emit(): void { this.valueChange.emit(this.getSelectedRows()); }
}
