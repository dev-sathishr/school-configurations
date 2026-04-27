import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CommonService } from '../../../../shared/services/common/common.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { DEGREE_OPTIONS } from '../../../../core/constants/enums';
import { API } from '../../../../core/api/endpoints';

interface Qualification {
  id: string;
  degree: string;
  field_of_study: string | null;
  institution: string;
  board_university: string | null;
  year_of_passing: number | null;
  grade: string | null;
  notes: string | null;
}

const DEGREE_LABEL: Record<string, string> = Object.fromEntries(
  DEGREE_OPTIONS.map(o => [o.value, o.label])
);

@Component({
  selector: 'app-employee-qualification-list',
  standalone: true,
  imports: [CommonModule, ButtonComponent, LoaderComponent, ConfirmDialogComponent],
  template: `
    <div>
      <div class="mb-4 flex items-center justify-between">
        <p class="text-muted-foreground text-xs">Academic and professional qualifications</p>
        @if (!readonly && ps.canEdit('EMPLOYEE_INFO')) {
          <app-button type="button" impact="bold" tone="primary" size="medium" shape="rounded" (buttonClick)="onAdd.emit()">
            + Add Qualification
          </app-button>
        }
      </div>

      @if (loading) {
        <app-loader size="small" text="Loading qualifications..." />
      } @else if (qualifications.length === 0) {
        <div class="border-muted/30 rounded-lg border border-dashed p-8 text-center">
          <p class="text-muted-foreground text-sm">No qualifications added yet.</p>
          <p class="text-muted-foreground mt-1 text-xs">Add academic or professional qualifications.</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (q of qualifications; track q.id) {
            <div class="border-muted/30 rounded-lg border p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-1.5">
                    <span class="bg-blue-500/10 text-blue-700 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                      {{ degreeLabel(q.degree) }}
                    </span>
                    @if (q.year_of_passing) {
                      <span class="text-muted-foreground text-[10px]">{{ q.year_of_passing }}</span>
                    }
                  </div>
                  <p class="text-foreground text-xs font-semibold">{{ q.institution }}</p>
                  @if (q.field_of_study) {
                    <p class="text-muted-foreground text-xs">{{ q.field_of_study }}</p>
                  }
                  @if (q.board_university) {
                    <p class="text-muted-foreground text-[11px] mt-0.5">{{ q.board_university }}</p>
                  }
                  @if (q.grade) {
                    <p class="text-muted-foreground text-[11px] mt-0.5">Grade / %: {{ q.grade }}</p>
                  }
                </div>
                <div class="flex shrink-0 gap-0.5">
                  @if (!readonly && ps.canEdit('EMPLOYEE_INFO')) {
                    <button type="button" (click)="onEdit.emit(q.id)" title="Edit"
                      class="text-muted-foreground hover:text-primary rounded p-1.5 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                  }
                  @if (ps.canView('EMPLOYEE_INFO')) {
                    <button type="button" (click)="onView.emit(q.id)" title="View"
                      class="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.964-7.178z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  }
                  @if (!readonly && ps.canEdit('EMPLOYEE_INFO')) {
                    <button type="button" (click)="deleteId = q.id" title="Delete"
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
    </div>

    <app-confirm-dialog
      [visible]="!!deleteId"
      title="Delete Qualification"
      message="Are you sure you want to delete this qualification? This cannot be undone."
      confirmText="Delete"
      tone="danger"
      [loading]="deleting"
      (onConfirm)="doDelete()"
      (onCancel)="deleteId = ''" />
  `,
})
export class EmployeeQualificationListComponent implements OnChanges {
  @Input() employeeId = '';
  @Input() readonly = false;
  @Output() onAdd  = new EventEmitter<void>();
  @Output() onEdit = new EventEmitter<string>();
  @Output() onView = new EventEmitter<string>();

  readonly ps = inject(PermissionService);
  private cs  = inject(CommonService);
  private cdr = inject(ChangeDetectorRef);

  qualifications: Qualification[] = [];
  loading = false;
  deleteId = '';
  deleting = false;

  degreeLabel(val: string): string {
    return DEGREE_LABEL[val] ?? val;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employeeId'] && this.employeeId) this.load();
  }

  load(): void {
    if (!this.employeeId) return;
    this.loading = true;
    this.cs.getService({ url: API.employeeQualifications.base(this.employeeId) }).subscribe({
      next: (res: any) => {
        this.qualifications = res.data || [];
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
    this.cs.deleteService({ url: API.employeeQualifications.detail(this.employeeId, this.deleteId) }).subscribe({
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
