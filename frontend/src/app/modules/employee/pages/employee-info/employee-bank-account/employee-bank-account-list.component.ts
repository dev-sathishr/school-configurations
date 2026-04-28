import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { PermissionService } from '../../../../../core/services/permission.service';
import { BANK_ACCOUNT_TYPE_BADGES, BankAccountType } from '../../../../../core/constants/enums';
import { API } from '../../../../../core/api/endpoints';

interface BankAccount {
  id: string;
  bank_name: string;
  account_no: string;
  ifsc_code: string | null;
  branch_name: string | null;
  account_holder: string | null;
  account_type: BankAccountType;
  is_active: boolean;
}

@Component({
  selector: 'app-employee-bank-account-list',
  standalone: true,
  imports: [CommonModule, ButtonComponent, LoaderComponent],
  template: `
    <div>
      <!-- Header -->
      <div class="mb-4 flex items-center justify-between">
        <div>
          <p class="text-muted-foreground text-xs">Bank accounts linked to this employee</p>
        </div>
        <div class="flex gap-2">
          @if (!readonly && ps.canEdit('EMPLOYEE_INFO')) {
            <app-button type="button" impact="bold" tone="primary" size="medium" shape="rounded" (buttonClick)="onAdd.emit()">
              + Add Account
            </app-button>
          }
        </div>
      </div>

      @if (loading) {
        <app-loader size="small" text="Loading bank accounts..." />
      } @else if (accounts.length === 0) {
        <div class="border-muted/30 rounded-lg border border-dashed p-8 text-center">
          <p class="text-muted-foreground text-sm">No bank accounts yet.</p>
          <p class="text-muted-foreground mt-1 text-xs">Add a bank account to get started.</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (a of accounts; track a.id) {
            <div class="border-muted/30 rounded-lg border p-4 transition-colors"
              [class.border-primary]="a.is_active"
              [class.bg-primary/3]="a.is_active">

              <!-- Account header -->
              <div class="mb-3 flex items-start justify-between gap-3">
                <div class="flex items-center gap-2">
                  @if (a.is_active) {
                    <span class="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">Active</span>
                  } @else {
                    <span class="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">Inactive</span>
                  }
                  <span class="rounded-full px-2 py-0.5 text-[10px] font-medium" [class]="typeBadge(a.account_type)">
                    {{ typeLabel(a.account_type) }}
                  </span>
                  <span class="text-foreground text-xs font-semibold">{{ a.bank_name }}</span>
                </div>
                <div class="flex shrink-0 gap-0.5">
                  @if (!readonly && !a.is_active && ps.canEdit('EMPLOYEE_INFO')) {
                    <button type="button" (click)="onSetActive.emit(a.id)" title="Set as Active"
                      class="text-muted-foreground hover:text-green-600 rounded p-1.5 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  }
                  @if (!readonly && ps.canEdit('EMPLOYEE_INFO')) {
                    <button type="button" (click)="onEdit.emit(a.id)" title="Edit"
                      class="text-muted-foreground hover:text-primary rounded p-1.5 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                  }
                  @if (ps.canView('EMPLOYEE_INFO')) {
                    <button type="button" (click)="onView.emit(a.id)" title="View"
                      class="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.964-7.178z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  }
                </div>
              </div>

              <!-- Account details grid -->
              <div class="grid grid-cols-2 gap-x-6 gap-y-1.5 md:grid-cols-4">
                <div>
                  <p class="text-muted-foreground text-[10px] uppercase tracking-wide">Account No</p>
                  <p class="text-foreground text-xs font-medium">{{ a.account_no }}</p>
                </div>
                @if (a.ifsc_code) {
                  <div>
                    <p class="text-muted-foreground text-[10px] uppercase tracking-wide">IFSC Code</p>
                    <p class="text-foreground text-xs font-medium">{{ a.ifsc_code }}</p>
                  </div>
                }
                @if (a.branch_name) {
                  <div>
                    <p class="text-muted-foreground text-[10px] uppercase tracking-wide">Branch</p>
                    <p class="text-foreground text-xs font-medium">{{ a.branch_name }}</p>
                  </div>
                }
                @if (a.account_holder) {
                  <div>
                    <p class="text-muted-foreground text-[10px] uppercase tracking-wide">Account Holder</p>
                    <p class="text-foreground text-xs font-medium">{{ a.account_holder }}</p>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class EmployeeBankAccountListComponent implements OnChanges {
  @Input() employeeId = '';
  @Input() readonly = false;
  @Output() onAdd = new EventEmitter<void>();
  @Output() onEdit = new EventEmitter<string>();
  @Output() onView = new EventEmitter<string>();
  @Output() onSetActive = new EventEmitter<string>();

  readonly ps = inject(PermissionService);
  private cs = inject(CommonService);
  private cdr = inject(ChangeDetectorRef);

  accounts: BankAccount[] = [];
  loading = false;

  typeBadge(type: string): string {
    return BANK_ACCOUNT_TYPE_BADGES[type as BankAccountType]?.class ?? 'bg-muted text-muted-foreground';
  }

  typeLabel(type: string): string {
    return BANK_ACCOUNT_TYPE_BADGES[type as BankAccountType]?.label ?? type;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employeeId'] && this.employeeId) {
      this.load();
    }
  }

  load(): void {
    if (!this.employeeId) return;
    this.loading = true;
    this.cs.getService({ url: API.employeeBankAccounts.base(this.employeeId) }).subscribe({
      next: (res: any) => {
        this.accounts = res.data || [];
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
