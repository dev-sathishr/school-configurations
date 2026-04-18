import { Component, EventEmitter, Input, OnChanges, Output, computed, signal, SimpleChanges } from '@angular/core';
import * as XLSX from 'xlsx';
import { ButtonComponent } from '../../../button/button.component';
import { ModalComponent } from '../../../modal/modal.component';
import { CommonService } from '../../../../services/common/common.service';

interface ImportResult {
  success_count?: number;
  error_count?: number;
  errors?: { row: number; message: string }[];
}

@Component({
  selector: 'app-import-dialog',
  templateUrl: './import-dialog.component.html',
  imports: [ButtonComponent, ModalComponent],
})
export class ImportDialogComponent implements OnChanges {
  @Input() visible = false;
  /** Submit target; expects `${apiUrl}/import`. */
  @Input() apiUrl = '';
  /** Human-friendly name ("users", "groups"…) used in the dialog title. */
  @Input() entityLabel = 'records';

  @Output() onClose = new EventEmitter<void>();
  @Output() onImported = new EventEmitter<ImportResult>();

  // Signals so FileReader/HTTP callbacks update the view even in zoneless mode.
  fileName = signal('');
  parsedRows = signal<Record<string, unknown>[]>([]);
  previewHeaders = signal<string[]>([]);
  parseError = signal('');
  submitting = signal(false);
  result = signal<ImportResult | null>(null);

  // Per-row selection; indices refer to parsedRows.
  selectedIndices = signal<Set<number>>(new Set());
  selectedCount = computed(() => this.selectedIndices().size);
  totalCount = computed(() => this.parsedRows().length);
  allSelected = computed(() => this.totalCount() > 0 && this.selectedCount() === this.totalCount());
  noneSelected = computed(() => this.selectedCount() === 0);

  constructor(private cs: CommonService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue && !changes['visible'].previousValue) {
      this.reset();
    }
  }

  reset() {
    this.fileName.set('');
    this.parsedRows.set([]);
    this.previewHeaders.set([]);
    this.parseError.set('');
    this.submitting.set(false);
    this.result.set(null);
    this.selectedIndices.set(new Set());
  }

  close() {
    this.onClose.emit();
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.fileName.set(file.name);
    this.parseError.set('');
    this.result.set(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        if (rows.length === 0) {
          this.parseError.set('The file has no rows.');
          this.parsedRows.set([]);
          this.selectedIndices.set(new Set());
          return;
        }
        this.parsedRows.set(rows);
        this.previewHeaders.set(Object.keys(rows[0] as object));
        // Select every row by default — user unticks what they want to skip.
        const all = new Set<number>();
        for (let i = 0; i < rows.length; i++) all.add(i);
        this.selectedIndices.set(all);
      } catch (err) {
        console.error('Import parse error:', err);
        this.parseError.set('Could not read this file. CSV and Excel (.xlsx) are supported.');
        this.parsedRows.set([]);
        this.selectedIndices.set(new Set());
      }
    };
    reader.onerror = () => this.parseError.set('Failed to read the file.');
    reader.readAsArrayBuffer(file);
  }

  toggleRow(index: number) {
    const next = new Set(this.selectedIndices());
    if (next.has(index)) next.delete(index);
    else next.add(index);
    this.selectedIndices.set(next);
  }

  isRowSelected(index: number): boolean {
    return this.selectedIndices().has(index);
  }

  toggleAll() {
    if (this.allSelected()) {
      this.selectedIndices.set(new Set());
    } else {
      const all = new Set<number>();
      for (let i = 0; i < this.parsedRows().length; i++) all.add(i);
      this.selectedIndices.set(all);
    }
  }

  submit() {
    const rows = this.parsedRows();
    if (rows.length === 0 || !this.apiUrl) return;
    const picked = Array.from(this.selectedIndices()).sort((a, b) => a - b).map((i) => rows[i]);
    if (picked.length === 0) return;

    this.submitting.set(true);
    this.cs.postService({ url: `${this.apiUrl}/import`, payload: { rows: picked } }).subscribe({
      next: (res: ImportResult) => {
        this.submitting.set(false);
        this.result.set(res);
        this.onImported.emit(res);
      },
      error: (err) => {
        this.submitting.set(false);
        this.parseError.set(err?.error?.message || 'Import failed.');
      },
    });
  }
}
