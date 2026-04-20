import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from '../button/button.component';

/**
 * Reusable empty state. Drop below any list/table/section that can render
 * with no data. Keeps the "nothing here" experience consistent across the app
 * and nudges the user toward the primary action.
 *
 * Examples:
 *   <app-empty-state
 *     icon="assets/icons/heroicons/outline/users.svg"
 *     title="No users yet"
 *     description="Invite your first teammate to get started."
 *     actionLabel="+ New user"
 *     (actionClick)="addNew()" />
 *
 *   <app-empty-state
 *     title="No matching records"
 *     description="Try adjusting the filters or clearing the search." />
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [AngularSvgIconModule, ButtonComponent],
  template: `
    <div class="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div class="bg-muted/30 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        @if (icon) {
          <svg-icon [src]="icon" [svgClass]="'h-8 w-8 text-muted-foreground'"></svg-icon>
        } @else {
          <svg class="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24"
            stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
          </svg>
        }
      </div>
      <h3 class="text-foreground text-base font-semibold">{{ title }}</h3>
      @if (description) {
        <p class="text-muted-foreground mt-1 max-w-sm text-sm">{{ description }}</p>
      }
      @if (actionLabel) {
        <div class="mt-5">
          <app-button impact="bold" tone="primary" shape="rounded" size="medium" (buttonClick)="actionClick.emit()">
            {{ actionLabel }}
          </app-button>
        </div>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() icon = '';
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() actionLabel = '';
  @Output() actionClick = new EventEmitter<void>();
}
