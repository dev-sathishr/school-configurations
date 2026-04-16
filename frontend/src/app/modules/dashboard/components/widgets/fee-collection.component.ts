import { Component } from '@angular/core';
import { DashboardWidgetComponent } from './dashboard-widget.component';

@Component({
  selector: 'app-fee-collection',
  standalone: true,
  imports: [DashboardWidgetComponent],
  template: `
    <app-dashboard-widget title="Fee Collection" icon="assets/icons/heroicons/outline/gift.svg" colorClass="bg-green-500/10 text-green-600">
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">&#8377;12.5L</p>
          <p class="text-muted-foreground text-xs">Collected</p>
        </div>
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">&#8377;3.2L</p>
          <p class="text-muted-foreground text-xs">Pending</p>
        </div>
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">80%</p>
          <p class="text-muted-foreground text-xs">Collection Rate</p>
        </div>
      </div>
    </app-dashboard-widget>
  `,
})
export class FeeCollectionComponent {}
