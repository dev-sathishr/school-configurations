import { ChangeDetectorRef, Directive, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../services/common/common.service';
import { PermissionService } from '../../../core/services/permission.service';

/**
 * Base class for CRUD form pages. Centralizes the edit/view mode detection,
 * the initial record load, the create-vs-update branching, and the common
 * loading/saving/error state every form has been copy-pasting.
 *
 * A minimal subclass only declares the routes + builds its form group:
 *
 *   @Component({ ... })
 *   export class PermissionFormComponent extends FormPageBase {
 *     listRoute = '/settings/permission';
 *     resourcePath = '/permissions';
 *
 *     protected buildForm(): FormGroup {
 *       return this.fb.group({
 *         name: ['', V.SHORT_NAME],
 *         code: ['', V.CODE],
 *         description: ['', V.NOTES],
 *         is_active: [true],
 *       });
 *     }
 *   }
 *
 * Override the hooks as needed:
 *   - `unwrapResponse(res)`  — if the detail endpoint nests under `{ user }`,
 *                              `{ group }`, etc. instead of `{ data }`.
 *   - `onRecordLoaded(data)` — to populate related state (labels, lookups,
 *                              selected lists) beyond `patchValue`.
 *   - `toPayload()`          — to transform the form value before send.
 *   - `afterSave(res)`       — to chain post-save work (e.g. upload pending
 *                              files) before navigating away.
 */
@Directive()
export abstract class FormPageBase implements OnInit {
  protected readonly fb = inject(FormBuilder);
  protected readonly cs = inject(CommonService);
  protected readonly route = inject(ActivatedRoute);
  protected readonly cdr = inject(ChangeDetectorRef);
  /** Public so templates can gate buttons via `ps.canEdit(...)` etc. */
  readonly ps = inject(PermissionService);

  form!: FormGroup;

  editMode = false;
  viewMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';

  /** Frontend list route — used by `cancel()` and default post-save nav. */
  abstract listRoute: string;

  /** API path — `/users`, `/locations`, etc. No trailing slash. */
  abstract resourcePath: string;

  /** Subclass returns the reactive form. Called once in `ngOnInit`. */
  protected abstract buildForm(): FormGroup;

  ngOnInit(): void {
    this.form = this.buildForm();
    this.detectModeAndLoad();
  }

  get f() { return this.form.controls; }

  // ── Hooks (override as needed) ─────────────────────────────────────────

  /** Pull the record out of the API response. Most endpoints use `res.data`;
   *  override for legacy shapes like `{ user }` / `{ group }`. */
  protected unwrapResponse(res: any): any {
    return res?.data ?? res;
  }

  /** Default just patches the form. Override to seed labels, selected lists,
   *  sticky edit-mode values, etc. */
  protected onRecordLoaded(data: any): void {
    this.form.patchValue(data);
  }

  /** Return the payload to send on save. Default is the raw form value —
   *  override to transform (phone merging, password stripping, etc). */
  protected toPayload(): any {
    return this.form.value;
  }

  /** Post-save hook. Default navigates back to the list; override to chain
   *  follow-up calls (file uploads) or route elsewhere. */
  protected afterSave(_res: any): void {
    this.saving = false;
    this.cs.navigate({ url: this.listRoute });
  }

  /** Pre-submit guard for state that lives outside the reactive form —
   *  e.g. required addresses array, selected locations, etc. Return `false`
   *  to abort the submit (subclass sets its own error state for display). */
  protected beforeSubmit(): boolean {
    return true;
  }

  // ── Flow ───────────────────────────────────────────────────────────────

  /**
   * Detects edit/view mode from the route and fetches the record. Called by
   * the default `ngOnInit`; subclasses that need to pre-load related data
   * (dropdowns, matrices) override `ngOnInit` and call this explicitly after
   * the pre-load resolves.
   */
  protected detectModeAndLoad(): void {
    const id = this.cs.getRouteParam(this.route, 'id');
    if (!id) return;

    const segments = this.route.snapshot.url;
    const lastPath = segments[segments.length - 1]?.path;
    this.viewMode = lastPath === 'view';
    this.editMode = !this.viewMode;
    this.editId = id;
    this.loading = true;

    this.cs.getService({ url: `${this.resourcePath}/${id}` }).subscribe({
      next: (res: any) => {
        this.onRecordLoaded(this.unwrapResponse(res));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.cs.navigate({ url: this.listRoute });
      },
    });
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (!this.beforeSubmit()) return;
    if (this.form.invalid) return;

    this.saving = true;
    const payload = this.toPayload();
    const req = this.editMode
      ? this.cs.putService({ url: `${this.resourcePath}/${this.editId}`, payload })
      : this.cs.postService({ url: this.resourcePath, payload });

    req.subscribe({
      next: (res: any) => this.afterSave(res),
      error: (err: any) => this.handleSaveError(err),
    });
  }

  protected handleSaveError(err: any): void {
    this.saving = false;
    this.errorMessage = err?.error?.message || 'Something went wrong';
  }

  cancel(): void {
    this.cs.navigate({ url: this.listRoute });
  }

  switchToEdit(): void {
    this.cs.navigate({ url: `${this.listRoute}/${this.editId}/edit` });
  }
}
