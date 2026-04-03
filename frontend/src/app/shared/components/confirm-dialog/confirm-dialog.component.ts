import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  imports: [ButtonComponent],
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = 'Confirm';
  @Input() message = 'Are you sure?';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() tone: 'primary' | 'danger' = 'danger';
  @Input() loading = false;

  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  confirm(): void {
    this.onConfirm.emit();
  }

  cancel(): void {
    this.onCancel.emit();
  }
}
