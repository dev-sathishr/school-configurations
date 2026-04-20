import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoaderComponent } from '../loader/loader.component';
import { CommonService } from '../../services/common/common.service';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-select-dropdown',
  templateUrl: './select-dropdown.component.html',
  imports: [FormsModule, LoaderComponent],
})
export class SelectDropdownComponent implements OnInit, OnDestroy {
  // Options (static)
  @Input() options: DropdownOption[] = [];
  @Input() placeholder = 'Select...';
  @Input() searchPlaceholder = 'Search...';
  @Input() showSearch = true;
  @Input() hasError = false;

  // Single select
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();

  // Multi select
  @Input() multiSelect = false;
  @Input() selectedValues: string[] = [];
  @Output() selectedValuesChange = new EventEmitter<string[]>();
  // When true, renders a "Select all / Clear" toggle row at the top of the
  // options list (multi-select only). Acts on whatever options the user can
  // currently see — respects the search filter so large lists stay usable.
  @Input() showSelectAll = false;

  // Async (API-based)
  @Input() asyncUrl = '';
  @Input() asyncValueKey = 'id';
  @Input() asyncLabelKey = 'name';

  // Events
  @Output() closed = new EventEmitter<void>();

  // Initial label (to avoid extra API call in edit mode)
  @Input() initialLabel = '';
  @Input() initialLabels: Record<string, string> = {};

  // Trigger style
  @Input() triggerType: 'field' | 'custom' = 'field';
  @Input() headerText = '';
  @Input() showCount = true;

  @ViewChild('listContainer') listContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('triggerEl') triggerEl!: ElementRef<HTMLDivElement>;
  @ViewChild('dropdownPanel') dropdownPanel!: ElementRef<HTMLDivElement>;

  isOpen = false;
  dropdownStyle: { top: string; left: string; width: string } = { top: '0', left: '0', width: '0' };
  private scrollHandler = () => { this.close(); this.cdr.detectChanges(); };
  private resizeHandler = () => { this.close(); this.cdr.detectChanges(); };
  private documentClickHandler = (e: MouseEvent) => this.onDocumentClick(e);
  search = '';
  asyncOptions: DropdownOption[] = [];
  asyncPage = 1;
  asyncTotalCount = 0;
  asyncTotalPages = 1;
  asyncLoading = false;
  private searchTimer: any = null;
  private _selectedLabel = '';

  get isAsync(): boolean { return !!this.asyncUrl; }

  constructor(private cs: CommonService, private cdr: ChangeDetectorRef, private elRef: ElementRef) {}

  ngOnDestroy(): void {
    this.removeScrollListeners();
  }

  private addScrollListeners(): void {
    let parent = this.elRef.nativeElement.parentElement;
    while (parent) {
      parent.addEventListener('scroll', this.scrollHandler, { passive: true });
      parent = parent.parentElement;
    }
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    window.addEventListener('resize', this.resizeHandler);
    document.addEventListener('click', this.documentClickHandler, true);
  }

  private removeScrollListeners(): void {
    let parent = this.elRef.nativeElement.parentElement;
    while (parent) {
      parent.removeEventListener('scroll', this.scrollHandler);
      parent = parent.parentElement;
    }
    window.removeEventListener('scroll', this.scrollHandler);
    window.removeEventListener('resize', this.resizeHandler);
    document.removeEventListener('click', this.documentClickHandler, true);
  }

  private onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const triggerInside = this.triggerEl?.nativeElement?.contains(target);
    const panelInside = this.dropdownPanel?.nativeElement?.contains(target);
    if (!triggerInside && !panelInside) {
      this.close();
      this.cdr.detectChanges();
    }
  }

  ngOnInit(): void {
    if (this.initialLabel) {
      this._selectedLabel = this.initialLabel;
    } else if (this.isAsync && this.value) {
      this.loadSelectedLabel(this.value);
    }
  }

  // Display label for single/multi select trigger
  get selectedLabel(): string {
    if (this.multiSelect) {
      if (this.selectedValues.length === 0) return '';
      const allOpts = this.isAsync ? this.asyncOptions : this.options;
      const labels = this.selectedValues.map(v => {
        const match = allOpts.find(o => o.value === v);
        return match?.label || this.initialLabels[v] || v;
      });
      return labels.join(', ');
    }
    if (this.isAsync) {
      const match = this.asyncOptions.find((o) => o.value === this.value);
      return match?.label || this._selectedLabel;
    }
    const match = this.options.find((o) => o.value === this.value);
    return match?.label || '';
  }

  // Filtered options for static mode
  get filteredOptions(): DropdownOption[] {
    const opts = this.isAsync ? this.asyncOptions : this.options;
    if (!this.search) return opts;
    const q = this.search.toLowerCase();
    return opts.filter((o) => o.label.toLowerCase().includes(q));
  }

  // Display options — pins selected item at top for async mode
  get displayOptions(): DropdownOption[] {
    if (this.isAsync) {
      let opts = this.asyncOptions;
      if (this.search) {
        const q = this.search.toLowerCase();
        opts = opts.filter((o) => o.label.toLowerCase().includes(q));
      }
      // Pin selected item at top if it's not in the current page results
      if (this.value && !this.search && !opts.some((o) => o.value === this.value) && this._selectedLabel) {
        return [{ value: this.value, label: this._selectedLabel }, ...opts];
      }
      return opts;
    }
    return this.filteredOptions;
  }

  toggle(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.closed.emit();
      return;
    }
    this.updateDropdownPosition();
    this.isOpen = true;
    this.addScrollListeners();
    this.search = '';
    if (this.isAsync) {
      this.asyncPage = 1;
      this.asyncOptions = [];
      this.loadAsync(1);
    }
  }

  private updateDropdownPosition(): void {
    const el = this.triggerEl?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    this.dropdownStyle = {
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      width: `${Math.max(rect.width, 200)}px`,
    };
  }

  close(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.removeScrollListeners();
      this.closed.emit();
    }
  }

  isSelected(value: string): boolean {
    if (this.multiSelect) return this.selectedValues.includes(value);
    return this.value === value;
  }

  /** True if every currently-visible option is already selected. */
  get allVisibleSelected(): boolean {
    const visible = this.displayOptions;
    if (visible.length === 0) return false;
    return visible.every((o) => this.selectedValues.includes(o.value));
  }

  /** True if some but not all visible options are selected — drives the
   *  indeterminate tick so the user knows clicking will select the rest. */
  get someVisibleSelected(): boolean {
    const visible = this.displayOptions;
    if (visible.length === 0) return false;
    const selected = visible.filter((o) => this.selectedValues.includes(o.value)).length;
    return selected > 0 && selected < visible.length;
  }

  toggleSelectAll(): void {
    const visibleValues = this.displayOptions.map((o) => o.value);
    if (visibleValues.length === 0) return;

    if (this.allVisibleSelected) {
      // Clear only the visible ones — values outside the current search stay
      // selected so filtering isn't a destructive operation.
      const visibleSet = new Set(visibleValues);
      const updated = this.selectedValues.filter((v) => !visibleSet.has(v));
      this.selectedValues = updated;
      this.selectedValuesChange.emit(updated);
      return;
    }

    // Union without duplicates.
    const merged = Array.from(new Set([...this.selectedValues, ...visibleValues]));
    this.selectedValues = merged;
    this.selectedValuesChange.emit(merged);
  }

  select(opt: DropdownOption): void {
    if (this.multiSelect) {
      const idx = this.selectedValues.indexOf(opt.value);
      const updated = [...this.selectedValues];
      if (idx >= 0) {
        updated.splice(idx, 1);
      } else {
        updated.push(opt.value);
      }
      this.selectedValues = updated;
      this.selectedValuesChange.emit(updated);
    } else {
      this.value = opt.value;
      this.valueChange.emit(opt.value);
      if (this.isAsync) this._selectedLabel = opt.label;
      this.isOpen = false;
    }
  }

  onSearch(event: Event): void {
    this.search = (event.target as HTMLInputElement).value;
    if (this.isAsync) {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.asyncPage = 1;
        this.asyncOptions = [];
        this.loadAsync(1);
      }, 300);
    }
  }

  onScroll(): void {
    if (!this.isAsync) return;
    const el = this.listContainer?.nativeElement;
    if (!el || this.asyncLoading || this.asyncPage >= this.asyncTotalPages) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      this.asyncPage++;
      this.loadAsync(this.asyncPage);
    }
  }

  private loadAsync(page: number): void {
    if (!this.asyncUrl || this.asyncLoading) return;
    this.asyncLoading = true;
    const params: any = { page, size: 10 };
    if (this.search) params.search = this.search;

    this.cs.getService({ url: this.asyncUrl, params }).subscribe({
      next: (res: any) => {
        const newOpts = (res.data || []).map((item: any) => ({
          value: item[this.asyncValueKey],
          label: item[this.asyncLabelKey],
        }));
        this.asyncOptions = page === 1 ? newOpts : [...this.asyncOptions, ...newOpts];
        this.asyncTotalCount = res.pagination?.total_count || newOpts.length;
        this.asyncTotalPages = res.pagination?.total_pages || 1;
        this.asyncLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.asyncLoading = false; this.cdr.detectChanges(); },
    });
  }

  private loadSelectedLabel(value: string): void {
    this.cs.getService({ url: this.asyncUrl, params: { page: 1, size: 1000 } }).subscribe({
      next: (res: any) => {
        const match = (res.data || []).find((item: any) => item[this.asyncValueKey] === value);
        if (match) { this._selectedLabel = match[this.asyncLabelKey]; this.cdr.detectChanges(); }
      },
    });
  }
}
