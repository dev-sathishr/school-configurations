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

  @Output() onEditSelected = new EventEmitter<void>();
  @Output() onDeleteSelected = new EventEmitter<void>();

  showColumnsDropdown = false;

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
}
