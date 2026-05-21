import { Component, Input, OnChanges, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonService } from '../../../../shared/services/common/common.service';
import { API } from '../../../../core/api/endpoints';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SelectDropdownComponent } from '../../../../shared/components/select-dropdown/select-dropdown.component';

export interface WorkflowState {
  name: string;
  label: string;
  color: string;   // tailwind color key: green / yellow / red / blue / gray
  is_initial: boolean;
  is_final: boolean;
}

export interface WorkflowTransition {
  from_state: string;
  to_state: string;
  action_label: string;
  allowed_roles: string[];   // group codes
}

const COLOR_OPTIONS = [
  { value: 'gray',   label: 'Gray'   },
  { value: 'blue',   label: 'Blue'   },
  { value: 'yellow', label: 'Yellow' },
  { value: 'green',  label: 'Green'  },
  { value: 'red',    label: 'Red'    },
  { value: 'purple', label: 'Purple' },
];

@Component({
  selector: 'app-workflow-editor',
  templateUrl: './workflow-editor.component.html',
  imports: [FormsModule, ButtonComponent, SelectDropdownComponent],
})
export class WorkflowEditorComponent implements OnChanges {
  @Input() slug = '';

  private cs  = inject(CommonService);
  private cdr = inject(ChangeDetectorRef);

  loading  = false;
  saving   = false;
  hasWorkflow = false;
  isActive = true;

  states:      WorkflowState[]      = [];
  transitions: WorkflowTransition[] = [];

  readonly colorOptions = COLOR_OPTIONS;

  private loadedSlug = '';

  ngOnChanges(): void {
    if (this.slug && this.slug !== this.loadedSlug) this.load();
  }

  private load(): void {
    this.loadedSlug = this.slug;
    this.loading = true;
    this.cs.getService({ url: API.engineWorkflow.get(this.slug) }).subscribe({
      next: (res: any) => {
        const wf = res?.data;
        if (wf) {
          this.hasWorkflow  = true;
          this.isActive     = wf.is_active ?? true;
          this.states       = wf.states ?? [];
          this.transitions  = wf.transitions ?? [];
        } else {
          this.hasWorkflow  = false;
          this.states       = [];
          this.transitions  = [];
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  // ── States ──────────────────────────────────────────────────────────

  addState(): void {
    this.states = [...this.states, { name: '', label: '', color: 'gray', is_initial: false, is_final: false }];
  }

  removeState(i: number): void {
    const removed = this.states[i].name;
    this.states = this.states.filter((_, idx) => idx !== i);
    this.transitions = this.transitions.filter(t => t.from_state !== removed && t.to_state !== removed);
  }

  setInitial(i: number): void {
    this.states = this.states.map((s, idx) => ({ ...s, is_initial: idx === i }));
  }

  trackState(_: number, s: WorkflowState) { return s.name; }

  // ── Transitions ─────────────────────────────────────────────────────

  addTransition(): void {
    this.transitions = [...this.transitions, { from_state: '', to_state: '', action_label: '', allowed_roles: [] }];
  }

  removeTransition(i: number): void {
    this.transitions = this.transitions.filter((_, idx) => idx !== i);
  }

  updateAllowedRoles(i: number, value: string): void {
    this.transitions[i].allowed_roles = value.split(',').map(s => s.trim()).filter(Boolean);
  }

  trackTransition(i: number) { return i; }

  get stateNames(): string[] { return this.states.map(s => s.name).filter(Boolean); }
  get stateOptions(): { value: string; label: string }[] {
    return this.stateNames.map(n => ({ value: n, label: n }));
  }

  setStateColor(i: number, color: string): void { this.states[i].color = color; }
  setFromState(i: number, state: string): void   { this.transitions[i].from_state = state; }
  setToState(i: number, state: string): void     { this.transitions[i].to_state = state; }

  // ── Save / Delete ────────────────────────────────────────────────────

  save(): void {
    this.saving = true;
    this.cs.postService({
      url: API.engineWorkflow.save(this.slug),
      payload: { states: this.states, transitions: this.transitions, is_active: this.isActive },
    }).subscribe({
      next: () => {
        this.saving = false;
        this.hasWorkflow = true;
        this.cs.showToastr({ type: 'success', message: 'Workflow saved' });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.saving = false;
        this.cs.showToastr({ type: 'error', message: err?.error?.message || 'Failed to save workflow' });
        this.cdr.markForCheck();
      },
    });
  }

  deleteWorkflow(): void {
    if (!confirm('Delete this workflow? Records will keep their current state but no transitions will be possible.')) return;
    this.cs.deleteService({ url: API.engineWorkflow.delete(this.slug) }).subscribe({
      next: () => {
        this.hasWorkflow = false;
        this.states = [];
        this.transitions = [];
        this.cs.showToastr({ type: 'success', message: 'Workflow deleted' });
        this.cdr.markForCheck();
      },
    });
  }

  colorClass(color: string): string {
    const map: Record<string, string> = {
      gray:   'bg-gray-100 text-gray-700',
      blue:   'bg-blue-100 text-blue-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      green:  'bg-green-100 text-green-700',
      red:    'bg-red-100 text-red-700',
      purple: 'bg-purple-100 text-purple-700',
    };
    return map[color] ?? map['gray'];
  }
}
