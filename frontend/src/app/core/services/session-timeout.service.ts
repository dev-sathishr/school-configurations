import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Shows the user a "your session is about to expire" modal `WARNING_LEAD_MS`
 * before the JWT's `exp`. If they click "Stay signed in", we refresh the
 * access token and reschedule. If they ignore it, the hard-logout timer
 * fires at expiry and signs them out cleanly.
 *
 * Wired in via `AuthGuard` (same place `SessionTrackingService` starts) so
 * instantiation happens the first time a guard runs, which is the earliest
 * reliable post-login moment.
 *
 * One instance per tab — if the user has multiple tabs open they each run
 * their own timer, which is fine because `refreshAccessToken()` is
 * idempotent-ish (each returns a fresh access_token from the same refresh).
 */
@Injectable({ providedIn: 'root' })
export class SessionTimeoutService {
  private readonly auth = inject(AuthService);

  private readonly WARNING_LEAD_MS = 2 * 60 * 1000; // show warning 2 min before expiry

  readonly warningVisible = signal(false);
  readonly secondsRemaining = signal(0);

  private warnTimer: any = null;
  private expireTimer: any = null;
  private countdownTimer: any = null;

  /** (Re)schedule warning + expiry timers against the current token. Safe to
   *  call repeatedly — clears any existing timers first. */
  schedule(): void {
    this.clearTimers();
    this.warningVisible.set(false);

    const expiryMs = this.auth.getTokenExpiryMs();
    if (!expiryMs) return;

    const now = Date.now();
    const msUntilExpiry = expiryMs - now;
    if (msUntilExpiry <= 0) {
      // Token already dead — let AuthService cleanup on next guarded nav.
      return;
    }

    const msUntilWarning = Math.max(0, msUntilExpiry - this.WARNING_LEAD_MS);

    this.warnTimer = setTimeout(() => this.openWarning(), msUntilWarning);
    this.expireTimer = setTimeout(() => this.expireNow(), msUntilExpiry);
  }

  /** User clicked "Stay signed in" — refresh the token and reschedule. */
  stayLoggedIn(): void {
    this.auth.refreshAccessToken().subscribe({
      next: () => this.schedule(),
      error: () => this.expireNow(),
    });
  }

  /** User clicked "Sign out" or ignored the warning past expiry. */
  signOut(): void {
    this.clearTimers();
    this.warningVisible.set(false);
    this.auth.logout();
  }

  stop(): void {
    this.clearTimers();
    this.warningVisible.set(false);
  }

  private openWarning(): void {
    const expiryMs = this.auth.getTokenExpiryMs();
    if (!expiryMs) return;
    this.warningVisible.set(true);
    this.tickCountdown();
    this.countdownTimer = setInterval(() => this.tickCountdown(), 1000);
  }

  private tickCountdown(): void {
    const expiryMs = this.auth.getTokenExpiryMs();
    if (!expiryMs) return;
    const remaining = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000));
    this.secondsRemaining.set(remaining);
  }

  private expireNow(): void {
    this.signOut();
  }

  private clearTimers(): void {
    if (this.warnTimer) { clearTimeout(this.warnTimer); this.warnTimer = null; }
    if (this.expireTimer) { clearTimeout(this.expireTimer); this.expireTimer = null; }
    if (this.countdownTimer) { clearInterval(this.countdownTimer); this.countdownTimer = null; }
  }
}
