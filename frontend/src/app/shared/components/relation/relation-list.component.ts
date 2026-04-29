import { ChangeDetectorRef, Component, Input, OnChanges, Output, EventEmitter, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';
import { LoaderComponent } from '../loader/loader.component';
import { CommonService } from '../../services/common/common.service';
import { PermissionService } from '../../../core/services/permission.service';
import { RELATION_TYPE_OPTIONS, RelationType } from '../../../core/constants/enums';

interface RelationMember {
  id: string;
  relation_type: RelationType;
  name: string;
  dob: string | null;
  gender: string | null;
  aadhaar_no: string | null;
  contact_code: string;
  contact_no: string | null;
  email: string | null;
  occupation: string | null;
  qualification: string | null;
  annual_income: number | null;
  is_emergency_contact: boolean;
  notes: string | null;
}

const RELATION_LABELS: Record<string, string> =
  RELATION_TYPE_OPTIONS.reduce((acc, o) => { acc[o.value] = o.label; return acc; }, {} as Record<string, string>);

@Component({
  selector: 'app-relation-list',
  standalone: true,
  imports: [CommonModule, ButtonComponent, LoaderComponent],
  template: `
    <div>
      <div class="mb-4 flex items-center justify-between">
        <p class="text-muted-foreground text-xs">Family members linked to this record</p>
        @if (!readonly && !hideAddButton && ps.canEdit(moduleCode)) {
          <app-button type="button" impact="light" tone="primary" size="small" shape="rounded" (buttonClick)="onAdd.emit()">
            + Add Member
          </app-button>
        }
      </div>

      @if (loading) {
        <app-loader size="small" text="Loading family info..." />
      } @else if (members.length === 0) {
        <div class="border-muted/30 rounded-lg border border-dashed p-8 text-center">
          <p class="text-muted-foreground text-sm">No family members added yet.</p>
          <p class="text-muted-foreground mt-1 text-xs">Add family members to keep records.</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (m of members; track m.id) {
            <div class="border-muted/30 rounded-lg border p-4 transition-colors"
              [class.border-amber-500]="m.is_emergency_contact"
              [class.bg-amber-500/3]="m.is_emergency_contact">

              <div class="mb-3 flex items-start justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                    {{ relationLabel(m.relation_type) }}
                  </span>
                  @if (m.is_emergency_contact) {
                    <span class="bg-amber-500/10 text-amber-700 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                      Emergency Contact
                    </span>
                  }
                  <span class="text-foreground text-xs font-semibold">{{ m.name }}</span>
                </div>
                <div class="flex shrink-0 gap-0.5">
                  @if (!readonly && ps.canEdit(moduleCode)) {
                    <button type="button" (click)="onEdit.emit(m.id)" title="Edit"
                      class="text-muted-foreground hover:text-primary rounded p-1.5 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                  }
                  @if (ps.canView(moduleCode)) {
                    <button type="button" (click)="onView.emit(m.id)" title="View"
                      class="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.964-7.178z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  }
                  @if (!readonly && ps.canEdit(moduleCode)) {
                    <button type="button" (click)="onDelete.emit(m.id)" title="Delete"
                      class="text-muted-foreground hover:text-red-600 rounded p-1.5 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  }
                </div>
              </div>

              <div class="grid grid-cols-2 gap-x-6 gap-y-1.5 md:grid-cols-4">
                @if (m.contact_no) {
                  <div>
                    <p class="text-muted-foreground text-[10px] uppercase tracking-wide">Contact</p>
                    <p class="text-foreground text-xs font-medium">{{ m.contact_code }} {{ m.contact_no }}</p>
                  </div>
                }
                @if (m.email) {
                  <div>
                    <p class="text-muted-foreground text-[10px] uppercase tracking-wide">Email</p>
                    <p class="text-foreground text-xs font-medium">{{ m.email }}</p>
                  </div>
                }
                @if (m.dob) {
                  <div>
                    <p class="text-muted-foreground text-[10px] uppercase tracking-wide">Date of Birth</p>
                    <p class="text-foreground text-xs font-medium">{{ m.dob | date:'dd MMM yyyy' }}</p>
                  </div>
                }
                @if (m.occupation) {
                  <div>
                    <p class="text-muted-foreground text-[10px] uppercase tracking-wide">Occupation</p>
                    <p class="text-foreground text-xs font-medium">{{ m.occupation }}</p>
                  </div>
                }
                @if (m.annual_income) {
                  <div>
                    <p class="text-muted-foreground text-[10px] uppercase tracking-wide">Annual Income</p>
                    <p class="text-foreground text-xs font-medium">{{ m.annual_income | number }}</p>
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
export class RelationListComponent implements OnChanges {
  /** REST base URL for this entity's family — e.g. /employees/:id/family */
  @Input() apiBaseUrl = '';
  /** Module code for permission checks — e.g. 'EMPLOYEE_INFO' or 'ADMISSION_MANAGEMENT' */
  @Input() moduleCode = '';
  @Input() readonly = false;
  @Input() hideAddButton = false;

  @Output() onAdd    = new EventEmitter<void>();
  @Output() onEdit   = new EventEmitter<string>();
  @Output() onView   = new EventEmitter<string>();
  @Output() onDelete = new EventEmitter<string>();

  readonly ps = inject(PermissionService);
  private cs  = inject(CommonService);
  private cdr = inject(ChangeDetectorRef);

  members: RelationMember[] = [];
  loading = false;

  relationLabel(type: string): string {
    return RELATION_LABELS[type] ?? type;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['apiBaseUrl'] && this.apiBaseUrl) this.load();
  }

  load(): void {
    if (!this.apiBaseUrl) return;
    this.loading = true;
    this.cs.getService({ url: this.apiBaseUrl }).subscribe({
      next: (res: any) => {
        this.members = res.data || [];
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
