import { Component, Input } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

@Component({
  selector: 'app-dashboard-widget',
  standalone: true,
  imports: [AngularSvgIconModule],
  template: `
    <div class="bg-background border-muted/20 rounded-xl border p-5">
      <div class="mb-4 flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg {{ colorClass }}">
          <svg-icon [src]="icon" [svgClass]="'h-5 w-5'"></svg-icon>
        </div>
        <h3 class="text-foreground text-sm font-semibold">{{ title }}</h3>
      </div>
      <ng-content></ng-content>
    </div>
  `,
})
export class DashboardWidgetComponent {
  @Input() title = '';
  @Input() icon = '';
  @Input() colorClass = 'bg-primary/10 text-primary';
}
