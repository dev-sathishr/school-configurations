import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  tone: 'primary' | 'danger';
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (result: boolean) => void;
}

/**
 * Programmatic wrapper around `<app-confirm-dialog>`. Any component can call
 * `confirm.ask({...})` and get a Promise back that resolves `true` when the
 * user clicks confirm or `false` otherwise. Useful wherever the result
 * drives control flow — e.g. the `canDeactivate` route guard for
 * unsaved-form protection, or synchronous "are you sure?" confirmations
 * outside a component's own template.
 *
 * Backed by a signal that a single `<app-confirm-host>` (mounted in the
 * layout) renders into, so there's at most one dialog on screen. Calls made
 * while a dialog is already open are resolved as `false` so the caller isn't
 * left hanging forever.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<ConfirmRequest | null>(null);

  ask(opts: Partial<ConfirmOptions> = {}): Promise<boolean> {
    // If another dialog is already open, reject the newcomer rather than
    // stacking invisible promises. Callers that care can check .request()
    // before asking.
    const existing = this.request();
    if (existing) return Promise.resolve(false);

    return new Promise<boolean>((resolve) => {
      this.request.set({
        title: opts.title || 'Confirm',
        message: opts.message || 'Are you sure?',
        confirmText: opts.confirmText || 'Confirm',
        cancelText: opts.cancelText || 'Cancel',
        tone: opts.tone || 'primary',
        resolve,
      });
    });
  }

  /** Called by the host component on confirm/cancel click. */
  resolveWith(result: boolean): void {
    const req = this.request();
    if (req) {
      req.resolve(result);
      this.request.set(null);
    }
  }
}
