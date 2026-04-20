import { Injectable, signal, computed } from '@angular/core';

/**
 * Counts concurrent in-flight HTTP requests so the global loading bar at the
 * top of the page knows when to show. Request completion (success or error)
 * decrements — kept symmetric via try/finally-style interceptor wiring.
 *
 * Exposed as a signal so the loading bar can bind with zoneless change
 * detection. `active` flips true the instant any request fires and stays
 * true until every concurrent request has returned.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _count = signal(0);
  readonly active = computed(() => this._count() > 0);

  start(): void {
    this._count.update((n) => n + 1);
  }

  stop(): void {
    this._count.update((n) => Math.max(0, n - 1));
  }
}
