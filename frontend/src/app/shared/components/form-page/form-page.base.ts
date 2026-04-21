import { ChangeDetectorRef, Directive, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../services/common/common.service';
import { ConfirmService } from '../../services/confirm/confirm.service';
import { PermissionService } from '../../../core/services/permission.service';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';
import { EditLockService } from '../../../core/services/edit-lock.service';

@Directive()
export abstract class FormPageBase implements OnInit, OnDestroy, CanComponentDeactivate {
  protected readonly fb = inject(FormBuilder);
  protected readonly cs = inject(CommonService);
  protected readonly route = inject(ActivatedRoute);
  protected readonly cdr = inject(ChangeDetectorRef);
  protected readonly confirmService = inject(ConfirmService);
  protected readonly editLockService = inject(EditLockService);
  readonly ps = inject(PermissionService);

  form!: FormGroup;

  editMode = false;
  viewMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';
  protected recordUpdatedAt = '';

  private lockAcquired = false;
  private lockModuleCode = '';
  private lockRecordId = '';
  private lockHeartbeat: ReturnType<typeof setInterval> | null = null;

  abstract listRoute: string;
  abstract resourcePath: string;
  protected abstract buildForm(): FormGroup;

  ngOnInit(): void {
    this.form = this.buildForm();
    this.detectModeAndLoad();
  }

  ngOnDestroy(): void {
    this.releaseEditLock();
  }

  get f() { return this.form.controls; }

  protected unwrapResponse(res: any): any {
    return res?.data ?? res;
  }

  protected onRecordLoaded(data: any): void {
    this.form.patchValue(data);
  }

  protected toPayload(): any {
    return this.form.value;
  }

  protected afterSave(_res: any): void {
    this.saving = false;
    this.cs.navigate({ url: this.listRoute });
  }

  protected beforeSubmit(): boolean {
    return true;
  }

  protected detectModeAndLoad(): void {
    const id = this.cs.getRouteParam(this.route, 'id');
    if (!id) return;

    const segments = this.route.snapshot.url;
    const lastPath = segments[segments.length - 1]?.path;
    this.viewMode = lastPath === 'view';
    this.editMode = !this.viewMode;
    this.editId = id;
    this.loading = true;

    if (this.shouldAcquireEditLock()) {
      this.acquireEditLock(id);
      return;
    }

    this.loadRecord(id);
  }

  private shouldAcquireEditLock(): boolean {
    if (!this.editMode || !this.editId) return false;
    return !!this.currentModuleCode();
  }

  private currentModuleCode(): string {
    const raw = this.route.snapshot.data?.['moduleCode'];
    return String(raw || '').trim().toUpperCase();
  }

  private loadRecord(id: string): void {
    this.cs.getService({ url: `${this.resourcePath}/${id}` }).subscribe({
      next: (res: any) => {
        const data = this.unwrapResponse(res);
        this.recordUpdatedAt = data?.updated_at || '';
        this.onRecordLoaded(data);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.releaseEditLock();
        this.loading = false;
        this.cdr.detectChanges();
        this.cs.navigate({ url: this.listRoute });
      },
    });
  }

  private acquireEditLock(recordId: string): void {
    const moduleCode = this.currentModuleCode();
    if (!moduleCode) {
      this.loadRecord(recordId);
      return;
    }

    this.editLockService.acquire(moduleCode, recordId).subscribe({
      next: (res: any) => {
        const lock = res?.data || {};
        if (lock.acquired) {
          this.lockAcquired = true;
          this.lockModuleCode = moduleCode;
          this.lockRecordId = recordId;
          this.startLockHeartbeat();
        }
        this.loadRecord(recordId);
      },
      error: (err: any) => {
        this.loading = false;
        this.cdr.detectChanges();
        this.cs.showToastr({
          type: 'error',
          message: err?.error?.message || 'This record is currently being edited by another user',
        });
        this.navigateAfterLockFailure();
      },
    });
  }

  private startLockHeartbeat(): void {
    if (this.lockHeartbeat) clearInterval(this.lockHeartbeat);
    this.lockHeartbeat = setInterval(() => {
      if (!this.lockAcquired || !this.lockModuleCode || !this.lockRecordId) return;
      this.editLockService.acquire(this.lockModuleCode, this.lockRecordId).subscribe({
        next: () => {},
        error: () => {},
      });
    }, 60_000);
  }

  private stopLockHeartbeat(): void {
    if (!this.lockHeartbeat) return;
    clearInterval(this.lockHeartbeat);
    this.lockHeartbeat = null;
  }

  private releaseEditLock(): void {
    this.stopLockHeartbeat();
    if (!this.lockAcquired || !this.lockModuleCode || !this.lockRecordId) return;

    const moduleCode = this.lockModuleCode;
    const recordId = this.lockRecordId;
    this.lockAcquired = false;
    this.lockModuleCode = '';
    this.lockRecordId = '';

    this.editLockService.release(moduleCode, recordId).subscribe({
      next: () => {},
      error: () => {},
    });
  }

  private navigateAfterLockFailure(): void {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    this.cs.navigate({ url: this.listRoute });
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (!this.beforeSubmit()) return;
    if (this.form.invalid) return;

    this.saving = true;
    const payload = this.toPayload();
    if (this.editMode) {
      payload.updated_at = this.recordUpdatedAt;
    }

    const req = this.editMode
      ? this.cs.putService({ url: `${this.resourcePath}/${this.editId}`, payload })
      : this.cs.postService({ url: this.resourcePath, payload });

    req.subscribe({
      next: (res: any) => {
        const updated = this.unwrapResponse(res);
        if (updated?.updated_at) {
          this.recordUpdatedAt = updated.updated_at;
        }
        if (this.editMode) {
          this.releaseEditLock();
        }
        this.form.markAsPristine();
        this.afterSave(res);
      },
      error: (err: any) => this.handleSaveError(err),
    });
  }

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
    this.releaseEditLock();
    this.cs.navigate({ url: this.listRoute });
  }

  switchToEdit(): void {
    this.cs.navigate({ url: `${this.listRoute}/${this.editId}/edit` });
  }

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
