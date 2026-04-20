import { Component, inject } from '@angular/core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ConfirmService } from '../../services/confirm/confirm.service';

/**
 * Host that renders the shared `<app-confirm-dialog>` when `ConfirmService`
 * has an active request. Mount once in the layout so any caller can invoke
 * `confirm.ask(...)` from anywhere without wiring a dialog per-page.
 */
@Component({
  selector: 'app-confirm-host',
  standalone: true,
  imports: [ConfirmDialogComponent],
  template: `
    @if (svc.request(); as req) {
      <app-confirm-dialog
        [visible]="true"
        [title]="req.title"
        [message]="req.message"
        [confirmText]="req.confirmText"
        [cancelText]="req.cancelText"
        [tone]="req.tone"
        (onConfirm)="svc.resolveWith(true)"
        (onCancel)="svc.resolveWith(false)">
      </app-confirm-dialog>
    }
  `,
})
export class ConfirmHostComponent {
  readonly svc = inject(ConfirmService);
}
