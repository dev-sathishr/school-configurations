import { Component, inject } from '@angular/core';
import { LoadingService } from '../../services/loading/loading.service';

/**
 * Thin 2px bar pinned to the very top of the viewport that animates while
 * any HTTP request is in flight. Binds to `LoadingService.active` (a
 * computed signal) so zoneless CD picks up changes automatically.
 *
 * Kept dead simple: no progress percentage, no trickle — just an indeterminate
 * stripe. That's plenty of signal for an admin tool.
 */
@Component({
  selector: 'app-loading-bar',
  standalone: true,
  template: `
    @if (loading.active()) {
      <div class="bg-muted/40 pointer-events-none fixed inset-x-0 top-0 z-[9999] h-0.5 overflow-hidden">
        <div class="loading-bar-shimmer h-full w-full bg-primary"></div>
      </div>
    }
  `,
  styles: [`
    .loading-bar-shimmer {
      transform: translateX(-100%);
      animation: loading-bar-slide 1.2s linear infinite;
    }
    @keyframes loading-bar-slide {
      0%   { transform: translateX(-100%); }
      50%  { transform: translateX(30%); }
      100% { transform: translateX(100%); }
    }
  `],
})
export class LoadingBarComponent {
  readonly loading = inject(LoadingService);
}
