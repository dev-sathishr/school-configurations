import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  imports: [NgClass],
})
export class ModalComponent {
  @Input() visible = false;
  @Input() title = '';
  @Input() size: 'small' | 'medium' | 'large' | 'full' = 'medium';
  @Input() closeOnBackdrop = false;
  @Input() closeOnEsc = true;
  @Input() showClose = true;

  @Output() onClose = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.visible && this.closeOnEsc) this.close();
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop) this.close();
  }

  close(): void {
    this.onClose.emit();
  }

  get sizeClass(): string {
    const sizes = {
      small: 'max-w-md',
      medium: 'max-w-2xl',
      large: 'max-w-4xl',
      full: 'max-w-6xl',
    };
    return sizes[this.size];
  }
}
