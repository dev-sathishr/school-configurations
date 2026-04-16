import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastPosition = 'top-right' | 'bottom-right';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  description?: string;
  duration: number;
  position: ToastPosition;
  removing?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  private _idCounter = 0;
  private _timers = new Map<number, { timer: any; remaining: number; started: number }>();

  readonly toasts = this._toasts.asReadonly();

  show(options: { type?: ToastType; message: string; description?: string; duration?: number; position?: ToastPosition }): void {
    const toast: Toast = {
      id: ++this._idCounter,
      type: options.type || 'info',
      message: options.message,
      description: options.description,
      duration: options.duration ?? 4000,
      position: options.position || 'top-right',
    };

    this._toasts.update(list => [...list, toast]);

    if (toast.duration > 0) {
      this.startTimer(toast.id, toast.duration);
    }
  }

  dismiss(id: number): void {
    this._timers.delete(id);
    this._toasts.update(list =>
      list.map(t => t.id === id ? { ...t, removing: true } : t)
    );
    setTimeout(() => {
      this._toasts.update(list => list.filter(t => t.id !== id));
    }, 300);
  }

  pause(id: number): void {
    const entry = this._timers.get(id);
    if (entry) {
      clearTimeout(entry.timer);
      entry.remaining -= Date.now() - entry.started;
    }
  }

  resume(id: number): void {
    const entry = this._timers.get(id);
    if (entry && entry.remaining > 0) {
      this.startTimer(id, entry.remaining);
    }
  }

  private startTimer(id: number, duration: number): void {
    const timer = setTimeout(() => this.dismiss(id), duration);
    this._timers.set(id, { timer, remaining: duration, started: Date.now() });
  }

  success(message: string, description?: string): void {
    this.show({ type: 'success', message, description });
  }

  error(message: string, description?: string): void {
    this.show({ type: 'error', message, description });
  }

  warning(message: string, description?: string): void {
    this.show({ type: 'warning', message, description });
  }

  info(message: string, description?: string): void {
    this.show({ type: 'info', message, description });
  }
}
