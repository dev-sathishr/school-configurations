import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { PermissionService } from '../../../../../core/services/permission.service';
import { API } from '../../../../../core/api/endpoints';

interface PayrollPeriod {
  id: string;
  joining_date: string;
  relieving_date: string | null;
  relieving_reason: string | null;
  probation_end_date: string | null;
  wage_type: string;
  basic_salary: number | null;
  day_wages: number | null;
  biometric_id: string | null;
  epf_applicable: boolean;
  epf_uan_no: string | null;
  pf_no: string | null;
  esi_applicable: boolean;
  esi_no: string | null;
  pan_no: string | null;
  is_current: boolean;
  notes: string | null;
}

@Component({
  selector: 'app-employee-payroll-list',
  standalone: true,
  imports: [CommonModule, ButtonComponent, LoaderComponent],
  template: `
    <div>
      <!-- Header -->
      <div class="mb-4 flex items-center justify-between">
        <div>
          <p class="text-muted-foreground text-xs">Employment periods and payroll configuration</p>
        </div>
        <div class="flex gap-2">
          @if (!readonly && ps.canCreate('EMPLOYEE_INFO') && hasCurrent) {
            <app-button type="button" impact="light" tone="primary" size="medium" shape="rounded" (buttonClick)="onAddRejoin.emit()">
              + Add Rejoin
            </app-button>
          }
          @if (!readonly && ps.canCreate('EMPLOYEE_INFO') && !hasCurrent) {
            <app-button type="button" impact="bold" tone="primary" size="medium" shape="rounded" (buttonClick)="onAdd.emit()">
              + Add Payroll
            </app-button>
          }
        </div>
      </div>

      @if (loading) {
        <app-loader size="small" text="Loading payroll history..." />
      } @else if (periods.length === 0) {
        <div class="border-muted/30 rounded-lg border border-dashed p-8 text-center">
          <p class="text-muted-foreground text-sm">No payroll records yet.</p>
          <p class="text-muted-foreground mt-1 text-xs">Add the joining details to get started.</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (p of periods; track p.id) {
            <div class="border-muted/30 rounded-lg border p-4 transition-colors"
              [class.border-primary]="p.is_current"
              [class.bg-primary/3]="p.is_current">

              <!-- Period header -->
              <div class="mb-3 flex items-start justify-between gap-3">
                <div class="flex items-center gap-2">
                  @if (p.is_current) {
                    <span class="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">Current</span>
                  } @else {
                    <span class="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">Past</span>
                  }
                  <span class="text-foreground text-xs font-semibold">
                    {{ p.joining_date | date:'dd MMM yyyy' }}
                    @if (p.relieving_date) { â€” {{ p.relieving_date | date:'dd MMM yyyy' }} }
                    @else { â€” Present }
                  </span>
                </div>
                <div class="flex shrink-0 gap-0.5">
                  @if (!readonly && ps.canEdit('EMPLOYEE_INFO')) {
                    <button type="button" (click)="onEdit.emit(p.id)" title="Edit"
                      class="text-muted-foreground hover:text-primary rounded p-1.5 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                  }
                  @if (ps.canView('EMPLOYEE_INFO')) {
                    <button type="button" (click)="onView.emit(p.id)" title="View"
                      class="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.964-7.178z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  }
                </div>
              </div>

              <!-- Period details grid -->
              <div class="grid grid-cols-2 gap-x-6 gap-y-1.5 md:grid-cols-4">
                <div>
                  <p class="text-muted-foreground text-[10px] uppercase tracking-wide">Wage Type</p>
                  <p class="text-foreground text-xs font-medium capitalize">{{ p.wage_type }}</p>
                </div>
                @if (p.basic_salary) {
                  <div>
                    <p class="text-muted-foreground text-[10px] uppercase tracking-wide">Basic Salary</p>
                    <p class="text-foreground text-xs font-medium">â‚¹ {{ p.basic_salary | number:'1.0-0' }}</p>
                  </div>
                }
                @if (p.day_wages) {
                  <div>
                    <p class="text-muted-foreground text-[10px] uppercase tracking-wide">Day Wages</p>
                    <p class="text-foreground text-xs font-medium">â‚¹ {{ p.day_wages | number:'1.0-0' }}</p>
                  </div>
                }
                @if (p.biometric_id) {
                  <div>
                    <p class="text-muted-foreground text-[10px] uppercase tracking-wide">Biometric ID</p>
                    <p class="text-foreground text-xs font-medium">{{ p.biometric_id }}</p>
                  </div>
                }
                @if (p.probation_end_date) {
                  <div>
                    <p class="text-muted-foreground text-[10px] uppercase tracking-wide">Probation Ends</p>
                    <p class="text-foreground text-xs font-medium">{{ p.probation_end_date | date:'dd MMM yyyy' }}</p>
                  </div>
                }
                @if (p.pan_no) {
                  <div>
                    <p class="text-muted-foreground text-[10px] uppercase tracking-wide">PAN</p>
                    <p class="text-foreground text-xs font-medium">{{ p.pan_no }}</p>
                  </div>
                }
              </div>

              <!-- Statutory badges -->
              <div class="mt-2.5 flex flex-wrap gap-1.5">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  [class.bg-green-500/10]="p.epf_applicable" [class.text-green-700]="p.epf_applicable"
                  [class.bg-muted]="!p.epf_applicable" [class.text-muted-foreground]="!p.epf_applicable">
                  EPF {{ p.epf_applicable ? 'âœ“' : 'âœ—' }}
                </span>
                <span class="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  [class.bg-green-500/10]="p.esi_applicable" [class.text-green-700]="p.esi_applicable"
                  [class.bg-muted]="!p.esi_applicable" [class.text-muted-foreground]="!p.esi_applicable">
                  ESI {{ p.esi_applicable ? 'âœ“' : 'âœ—' }}
                </span>
                @if (p.relieving_reason) {
                  <span class="bg-orange-500/10 text-orange-700 rounded-full px-2 py-0.5 text-[10px] font-medium">
                    Relieved: {{ p.relieving_reason }}
                  </span>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class EmployeePayrollListComponent implements OnChanges {
  @Input() employeeId = '';
  @Input() readonly = false;
  @Output() onAdd = new EventEmitter<void>();
  @Output() onAddRejoin = new EventEmitter<void>();
  @Output() onEdit = new EventEmitter<string>();
  @Output() onView = new EventEmitter<string>();

  readonly ps = inject(PermissionService);
  private cs = inject(CommonService);
  private cdr = inject(ChangeDetectorRef);

  periods: PayrollPeriod[] = [];
  loading = false;

  get hasCurrent(): boolean {
    return this.periods.some(p => p.is_current);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employeeId'] && this.employeeId) {
      this.load();
    }
  }

  load(): void {
    if (!this.employeeId) return;
    this.loading = true;
    this.cs.getService({ url: API.employeePayroll.base(this.employeeId) }).subscribe({
      next: (res: any) => {
        this.periods = res.data || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
