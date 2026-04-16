import { Component, computed, inject } from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { ToastService, Toast } from '../../services/toast/toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  imports: [NgClass, NgTemplateOutlet],
})
export class ToastComponent {
  toastService = inject(ToastService);

  topToasts = computed(() => this.toastService.toasts().filter(t => t.position === 'top-right'));
  bottomToasts = computed(() => this.toastService.toasts().filter(t => t.position === 'bottom-right'));

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  iconClass(toast: Toast): string {
    const map = {
      success: 'text-green-500',
      error: 'text-red-500',
      warning: 'text-amber-500',
      info: 'text-blue-500',
    };
    return map[toast.type];
  }

  borderClass(toast: Toast): string {
    const map = {
      success: 'border-l-green-500',
      error: 'border-l-red-500',
      warning: 'border-l-amber-500',
      info: 'border-l-blue-500',
    };
    return map[toast.type];
  }
}
