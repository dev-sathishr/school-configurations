import { ChangeDetectorRef, Directive, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../services/common/common.service';
import { ConfirmService } from '../../services/confirm/confirm.service';
import { PermissionService } from '../../../core/services/permission.service';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';

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
 *     resourcePath = API.permissions.base;
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
export abstract class FormPageBase implements OnInit, CanComponentDeactivate {
  protected readonly fb = inject(FormBuilder);
  protected readonly cs = inject(CommonService);
  protected readonly route = inject(ActivatedRoute);
  protected readonly cdr = inject(ChangeDetectorRef);
  protected readonly confirmService = inject(ConfirmService);
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

  /** API path — `API.users.base`, `API.locations.base`, etc. Must come from
   *  `core/api/endpoints.ts`, not a raw literal. No trailing slash. */
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
      next: (res: any) => {
        // Save succeeded → the form is no longer dirty. Marking pristine
        // here (rather than only in afterSave) means every subclass benefits
        // even when they override afterSave with custom navigation or
        // chained uploads — otherwise the CanDeactivate guard would prompt
        // "leave this page?" on the post-save redirect.
        this.form.markAsPristine();
        this.afterSave(res);
      },
      error: (err: any) => this.handleSaveError(err),
    });
  }

  /**
   * Default save-error handler. Rules:
   *   - 409 Conflict / 403 Forbidden → toast only (transient, server rejection,
   *     nothing the inline banner adds that the toast doesn't).
   *   - Everything else → inline banner + toast, so non-conflict server issues
   *     stay visible while the user decides what to do.
   * Subclasses can override for fully custom handling.
   */
  protected handleSaveError(err: any): void {
    this.saving = false;
    const message = err?.error?.message || 'Something went wrong';
    const status = err?.status;

    if (status === 409 || status === 403) {
      this.cs.showToastr({ type: 'error', message });
      this.errorMessage = '';
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = message;
    this.cs.showToastr({ type: 'error', message });
    this.cdr.detectChanges();
  }

  cancel(): void {
    this.cs.navigate({ url: this.listRoute });
  }

  switchToEdit(): void {
    this.cs.navigate({ url: `${this.listRoute}/${this.editId}/edit` });
  }

  /**
   * Route guard hook — asked by `UnsavedChangesGuard` when the user tries to
   * leave this page. Lets the form through silently when there's nothing
   * dirty (fresh view, already saved, or mid-submit); otherwise opens the
   * shared confirm dialog and returns a Promise the guard resolves on.
   *
   * Browser-level navigation (tab close, hard refresh) still falls back to
   * the native confirm via the `window.onbeforeunload` handler set up
   * separately — custom dialogs can't block that path.
   */
  canDeactivate(): boolean | Promise<boolean> {
    if (!this.form || this.form.pristine || this.saving) return true;
    return this.confirmService.ask({
      title: 'Leave this page?',
      message: 'You have unsaved changes. If you leave now, they will be lost.',
      confirmText: 'Leave',
      cancelText: 'Stay',
      tone: 'danger',
    });
  }
}
