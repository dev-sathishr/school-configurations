import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CommonService } from '../../../../shared/services/common/common.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { DOCUMENT_TYPE_CATEGORY_BADGES, DocumentTypeCategory } from '../../../../core/constants/enums';
import { API } from '../../../../core/api/endpoints';
import { environment } from 'src/environments/environment';

interface EmployeeDocument {
  id: string;
  document_type_id: string;
  document_type_name: string;
  document_type_code: string;
  document_type_category: DocumentTypeCategory;
  document_no: string | null;
  expiry_date: string | null;
  notes: string | null;
  file_id: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  file_size: number | null;
}

@Component({
  selector: 'app-employee-document-list',
  standalone: true,
  imports: [CommonModule, ButtonComponent, LoaderComponent, ConfirmDialogComponent],
  template: `
    <div>
      <div class="mb-4 flex items-center justify-between">
        <p class="text-muted-foreground text-xs">Uploaded identity, educational and employment documents</p>
        @if (!readonly && ps.canEdit('EMPLOYEE_INFO')) {
          <app-button type="button" impact="bold" tone="primary" size="medium" shape="rounded" (buttonClick)="onAdd.emit()">
            + Add Document
          </app-button>
        }
      </div>

      @if (loading) {
        <app-loader size="small" text="Loading documents..." />
      } @else if (records.length === 0) {
        <div class="border-muted/30 rounded-lg border border-dashed p-8 text-center">
          <p class="text-muted-foreground text-sm">No documents uploaded yet.</p>
          <p class="text-muted-foreground mt-1 text-xs">Add KYC, educational or employment documents.</p>
        </div>
      } @else {
        <!-- Group by category -->
        @for (cat of categories; track cat) {
          @if (byCategory[cat]?.length) {
            <div class="mb-4">
              <div class="mb-2 flex items-center gap-2">
                <span class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" [class]="categoryBadgeClass(cat)">
                  {{ categoryLabel(cat) }}
                </span>
                <span class="text-muted-foreground text-[10px]">{{ byCategory[cat].length }} document(s)</span>
              </div>
              <div class="space-y-2">
                @for (doc of byCategory[cat]; track doc.id) {
                  <div class="border-muted/30 rounded-lg border p-3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex-1 min-w-0">
                        <p class="text-foreground text-xs font-semibold">{{ doc.document_type_name }}</p>
                        <div class="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                          @if (doc.document_no) {
                            <span class="text-muted-foreground text-[11px]">No: {{ doc.document_no }}</span>
                          }
                          @if (doc.expiry_date) {
                            <span class="text-[11px]" [class]="isExpired(doc.expiry_date) ? 'text-red-600' : 'text-muted-foreground'">
                              Expiry: {{ doc.expiry_date | date:'dd MMM yyyy' }}
                              @if (isExpired(doc.expiry_date)) { <span class="font-semibold">(Expired)</span> }
                            </span>
                          }
                          @if (doc.file_id) {
                            <a [href]="fileUrl(doc.file_id)" target="_blank"
                              class="text-primary text-[11px] font-medium hover:underline flex items-center gap-0.5">
                              <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                              </svg>
                              {{ doc.file_name }}
                            </a>
                          } @else {
                            <span class="text-muted-foreground/60 text-[11px] italic">No file attached</span>
                          }
                        </div>
                      </div>
                      <div class="flex shrink-0 gap-0.5">
                        @if (!readonly && ps.canEdit('EMPLOYEE_INFO')) {
                          <button type="button" (click)="onEdit.emit(doc.id)" title="Edit"
                            class="text-muted-foreground hover:text-primary rounded p-1.5 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                        }
                        @if (ps.canView('EMPLOYEE_INFO')) {
                          <button type="button" (click)="onView.emit(doc.id)" title="View"
                            class="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.964-7.178z" />
                              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                        }
                        @if (!readonly && ps.canEdit('EMPLOYEE_INFO')) {
                          <button type="button" (click)="deleteId = doc.id" title="Delete"
                            class="text-muted-foreground hover:text-red-600 rounded p-1.5 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }
      }

      <app-confirm-dialog
        [visible]="!!deleteId"
        title="Delete Document"
        message="Are you sure you want to delete this document? The attached file will also be removed."
        confirmText="Delete"
        tone="danger"
        [loading]="deleting"
        (onConfirm)="doDelete()"
        (onCancel)="deleteId = ''" />
    </div>
  `,
})
export class EmployeeDocumentListComponent implements OnChanges {
  @Input() employeeId = '';
  @Input() readonly = false;
  @Output() onAdd  = new EventEmitter<void>();
  @Output() onEdit = new EventEmitter<string>();
  @Output() onView = new EventEmitter<string>();

  readonly ps  = inject(PermissionService);
  private cs   = inject(CommonService);
  private cdr  = inject(ChangeDetectorRef);

  records: EmployeeDocument[] = [];
  loading  = false;
  deleteId = '';
  deleting = false;

  readonly categories: DocumentTypeCategory[] = ['KYC', 'EDUCATIONAL', 'EMPLOYMENT', 'STATUTORY', 'MEDICAL', 'OTHER'];

  get byCategory(): Record<string, EmployeeDocument[]> {
    const map: Record<string, EmployeeDocument[]> = {};
    for (const r of this.records) {
      const cat = r.document_type_category;
      if (!map[cat]) map[cat] = [];
      map[cat].push(r);
    }
    return map;
  }

  categoryLabel(cat: string): string {
    return DOCUMENT_TYPE_CATEGORY_BADGES[cat as DocumentTypeCategory]?.label ?? cat;
  }

  categoryBadgeClass(cat: string): string {
    return DOCUMENT_TYPE_CATEGORY_BADGES[cat as DocumentTypeCategory]?.class ?? 'bg-muted text-muted-foreground';
  }

  fileUrl(fileId: string): string {
    const token = localStorage.getItem('access_token') || '';
    return `${environment.apiUrl}/files/${fileId}?token=${token}`;
  }

  isExpired(date: string): boolean {
    return new Date(date) < new Date();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employeeId'] && this.employeeId) this.load();
  }

  load(): void {
    if (!this.employeeId) return;
    this.loading = true;
    this.cs.getService({ url: API.employeeDocuments.base(this.employeeId) }).subscribe({
      next: (res: any) => {
        this.records = res.data || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  doDelete(): void {
    this.deleting = true;
    this.cs.deleteService({ url: API.employeeDocuments.detail(this.employeeId, this.deleteId) }).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteId = '';
        this.load();
      },
      error: (err: any) => {
        this.deleting = false;
        this.deleteId = '';
        this.cs.showToastr({ type: 'error', message: err?.error?.message || 'Failed to delete' });
      },
    });
  }
}
