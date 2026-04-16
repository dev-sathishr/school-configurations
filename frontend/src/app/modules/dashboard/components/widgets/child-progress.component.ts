import { Component } from '@angular/core';
import { DashboardWidgetComponent } from './dashboard-widget.component';

@Component({
  selector: 'app-child-progress',
  standalone: true,
  imports: [DashboardWidgetComponent],
  template: `
    <app-dashboard-widget title="Child Progress" icon="assets/icons/heroicons/outline/eye.svg" colorClass="bg-teal-500/10 text-teal-600">
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">88%</p>
          <p class="text-muted-foreground text-xs">Attendance</p>
        </div>
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">B+</p>
          <p class="text-muted-foreground text-xs">Current Grade</p>
        </div>
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">&#8377;0</p>
          <p class="text-muted-foreground text-xs">Fee Pending</p>
        </div>
      </div>
    </app-dashboard-widget>
  `,
})
export class ChildProgressComponent {}
