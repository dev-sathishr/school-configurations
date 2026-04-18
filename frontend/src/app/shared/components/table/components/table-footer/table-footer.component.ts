import { Component, computed, input } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TableFilterService } from '../../services/table-filter.service';
import { PAGE_SIZE_OPTIONS } from '../../../../utils/page-size-options';

@Component({
  selector: 'app-table-footer',
  imports: [AngularSvgIconModule],
  templateUrl: './table-footer.component.html',
  styleUrl: './table-footer.component.css',
})
export class TableFooterComponent {
  totalCount = input(0);
  pageSize = input(10);
  currentPage = input(1);

  constructor(private filterService: TableFilterService) {}

  // Include the current pageSize even if it isn't in the standard option
  // list — so an unusual global (e.g. 25) still shows correctly.
  pageSizeOptions = computed(() => {
    const size = this.pageSize();
    return PAGE_SIZE_OPTIONS.includes(size) ? PAGE_SIZE_OPTIONS : [...PAGE_SIZE_OPTIONS, size].sort((a, b) => a - b);
  });

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);
  rangeStart = computed(() => this.totalCount() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1);
  rangeEnd = computed(() => Math.min(this.currentPage() * this.pageSize(), this.totalCount()));

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];
    if (total <= 5) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  });

  onPageSizeChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.filterService.setPageSize(Number(val));
  }

  goToPage(page: number | string) {
    if (typeof page === 'number') this.filterService.pageField.set(page);
  }

  prev() {
    if (this.currentPage() > 1) this.filterService.pageField.set(this.currentPage() - 1);
  }

  next() {
    if (this.currentPage() < this.totalPages()) this.filterService.pageField.set(this.currentPage() + 1);
  }
}
