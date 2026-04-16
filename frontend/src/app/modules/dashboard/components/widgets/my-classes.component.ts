import { Component } from '@angular/core';
import { DashboardWidgetComponent } from './dashboard-widget.component';

@Component({
  selector: 'app-my-classes',
  standalone: true,
  imports: [DashboardWidgetComponent],
  template: `
    <app-dashboard-widget title="My Classes" icon="assets/icons/heroicons/outline/users.svg" colorClass="bg-orange-500/10 text-orange-600">
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">5</p>
          <p class="text-muted-foreground text-xs">Classes Assigned</p>
        </div>
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">180</p>
          <p class="text-muted-foreground text-xs">Total Students</p>
        </div>
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">3</p>
          <p class="text-muted-foreground text-xs">Today's Periods</p>
        </div>
      </div>
    </app-dashboard-widget>
  `,
})
export class MyClassesComponent {}
