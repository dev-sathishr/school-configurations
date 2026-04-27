import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CommonService } from '../../../../shared/services/common/common.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { API } from '../../../../core/api/endpoints';

interface Experience {
  id: string;
  organization: string;
  designation: string | null;
  from_date: string;
  to_date: string | null;
  is_current: boolean;
  notes: string | null;
}

function yearsMonths(from: string, to: string | null): string {
  const start = new Date(from);
  const end   = to ? new Date(to) : new Date();
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (months < 1) return '< 1 month';
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} yr${y > 1 ? 's' : ''}`);
  if (m) parts.push(`${m} mo`);
  return parts.join(' ');
}

@Component({
  selector: 'app-employee-experience-list',
  standalone: true,
  imports: [CommonModule, ButtonComponent, LoaderComponent, ConfirmDialogComponent],
  template: `
    <div>
      <div class="mb-4 flex items-center justify-between">
        <p class="text-muted-foreground text-xs">Previous and current employment history</p>
        @if (!readonly && ps.canEdit('EMPLOYEE_INFO')) {
          <app-button type="button" impact="bold" tone="primary" size="medium" shape="rounded" (buttonClick)="onAdd.emit()">
            + Add Experience
          </app-button>
        }
      </div>

      @if (loading) {
        <app-loader size="small" text="Loading experience..." />
      } @else if (records.length === 0) {
        <div class="border-muted/30 rounded-lg border border-dashed p-8 text-center">
          <p class="text-muted-foreground text-sm">No experience records added yet.</p>
          <p class="text-muted-foreground mt-1 text-xs">Add employment history to get started.</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (e of records; track e.id) {
            <div class="border-muted/30 rounded-lg border p-4 transition-colors"
              [class.border-primary]="e.is_current"
              [class.bg-primary/3]="e.is_current">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    @if (e.is_current) {
                      <span class="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">Current</span>
                    }
                    <span class="text-muted-foreground text-[10px]">
                      {{ e.from_date | date:'MMM yyyy' }} —
                      {{ e.to_date ? (e.to_date | date:'MMM yyyy') : 'Present' }}
                      &nbsp;·&nbsp;{{ duration(e.from_date, e.to_date) }}
                    </span>
                  </div>
                  <p class="text-foreground text-xs font-semibold">{{ e.organization }}</p>
                  @if (e.designation) {
                    <p class="text-muted-foreground text-xs">{{ e.designation }}</p>
                  }
                </div>
                <div class="flex shrink-0 gap-0.5">
                  @if (!readonly && ps.canEdit('EMPLOYEE_INFO')) {
                    <button type="button" (click)="onEdit.emit(e.id)" title="Edit"
                      class="text-muted-foreground hover:text-primary rounded p-1.5 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                  }
                  @if (ps.canView('EMPLOYEE_INFO')) {
                    <button type="button" (click)="onView.emit(e.id)" title="View"
                      class="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.964-7.178z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  }
                  @if (!readonly && ps.canEdit('EMPLOYEE_INFO')) {
                    <button type="button" (click)="deleteId = e.id" title="Delete"
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
      }

      <app-confirm-dialog
        [visible]="!!deleteId"
        title="Delete Experience"
        message="Are you sure you want to delete this experience record? This cannot be undone."
        confirmText="Delete"
        tone="danger"
        [loading]="deleting"
        (onConfirm)="doDelete()"
        (onCancel)="deleteId = ''" />
    </div>
  `,
})
export class EmployeeExperienceListComponent implements OnChanges {
  @Input() employeeId = '';
  @Input() readonly = false;
  @Output() onAdd  = new EventEmitter<void>();
  @Output() onEdit = new EventEmitter<string>();
  @Output() onView = new EventEmitter<string>();

  readonly ps = inject(PermissionService);
  private cs  = inject(CommonService);
  private cdr = inject(ChangeDetectorRef);

  records: Experience[] = [];
  loading  = false;
  deleteId = '';
  deleting = false;

  duration = yearsMonths;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employeeId'] && this.employeeId) this.load();
  }

  load(): void {
    if (!this.employeeId) return;
    this.loading = true;
    this.cs.getService({ url: API.employeeExperience.base(this.employeeId) }).subscribe({
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
    this.cs.deleteService({ url: API.employeeExperience.detail(this.employeeId, this.deleteId) }).subscribe({
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
