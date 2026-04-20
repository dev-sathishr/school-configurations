import { Component, computed, inject } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { SessionTimeoutService } from '../../../core/services/session-timeout.service';

/**
 * Modal that appears a couple of minutes before the JWT expires. The actual
 * scheduling lives in `SessionTimeoutService`; this component is purely the
 * presentational shell bound to that service's signals.
 *
 * Not using `ConfirmDialogComponent` because:
 *   1. The label/countdown changes every second — a dedicated component
 *      is cleaner than passing a dynamic message.
 *   2. The primary action is the *non-destructive* one (Stay), so the
 *      default tone/layout of ConfirmDialog (danger-oriented) doesn't fit.
 */
@Component({
  selector: 'app-session-timeout-warning',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    @if (svc.warningVisible()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="bg-background border-muted/30 mx-4 w-full max-w-md rounded-xl border p-6 shadow-xl">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <svg class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M12 6v6l3.75 3.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h3 class="text-foreground mb-2 text-center text-lg font-semibold">Session expiring soon</h3>
          <p class="text-muted-foreground mb-6 text-center text-sm">
            You'll be signed out in <span class="text-foreground font-semibold">{{ displayCountdown() }}</span>
            for your security. Stay signed in to keep working.
          </p>
          <div class="flex justify-center gap-3">
            <app-button impact="light" tone="light" shape="rounded" size="medium" (buttonClick)="svc.signOut()">
              Sign out
            </app-button>
            <app-button impact="bold" tone="primary" shape="rounded" size="medium" (buttonClick)="svc.stayLoggedIn()">
              Stay signed in
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
})
export class SessionTimeoutWarningComponent {
  readonly svc = inject(SessionTimeoutService);

  readonly displayCountdown = computed(() => {
    const s = this.svc.secondsRemaining();
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  });
}
