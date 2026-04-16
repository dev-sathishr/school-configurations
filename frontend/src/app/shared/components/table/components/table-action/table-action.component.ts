import { Component, ElementRef, EventEmitter, HostListener, Input, input, Output } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TableFilterService, ColumnConfig } from '../../services/table-filter.service';

@Component({
  selector: 'app-table-action',
  imports: [AngularSvgIconModule],
  templateUrl: './table-action.component.html',
  styleUrl: './table-action.component.css',
})
export class TableActionComponent {
  totalCount = input(0);
  filteredCount = input(0);
  selectedCount = input(0);
  isSingleSelected = input(false);
  @Input() columns: ColumnConfig[] = [];
  @Input() canEdit = true;
  @Input() canDelete = true;

  @Output() onEditSelected = new EventEmitter<void>();
  @Output() onDeleteSelected = new EventEmitter<void>();

  showColumnsDropdown = false;
  dragIndex: number | null = null;
  dragOverIndex: number | null = null;

  constructor(public filterService: TableFilterService, private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showColumnsDropdown = false;
    }
  }

  toggleFilters() {
    this.filterService.showFilters.update((v) => !v);
  }

  get hiddenColumnCount(): number {
    return this.columns.filter((c) => !this.filterService.isColumnVisible(c.key)).length;
  }

  onSearchChange(value: Event) {
    const input = value.target as HTMLInputElement;
    this.filterService.searchField.set(input.value);
    this.filterService.pageField.set(1);
  }

  toggleColumnsDropdown() {
    this.showColumnsDropdown = !this.showColumnsDropdown;
  }

  toggleColumn(col: ColumnConfig) {
    this.filterService.toggleColumnVisibility(col.key);
  }

  isColumnVisible(col: ColumnConfig): boolean {
    return this.filterService.isColumnVisible(col.key);
  }

  get orderedColumns(): ColumnConfig[] {
    return this.filterService.getOrderedColumns(this.columns);
  }

  onDragStart(index: number) {
    this.dragIndex = index;
  }

  onDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    this.dragOverIndex = index;
  }

  onDragLeave() {
    this.dragOverIndex = null;
  }

  onDrop(index: number) {
    if (this.dragIndex !== null && this.dragIndex !== index) {
      this.filterService.reorderColumn(this.dragIndex, index);
    }
    this.dragIndex = null;
    this.dragOverIndex = null;
  }

  onDragEnd() {
    this.dragIndex = null;
    this.dragOverIndex = null;
  }
}
