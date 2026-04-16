import { Component } from '@angular/core';
import { DashboardWidgetComponent } from './dashboard-widget.component';

@Component({
  selector: 'app-school-overview',
  standalone: true,
  imports: [DashboardWidgetComponent],
  template: `
    <app-dashboard-widget title="School Overview" icon="assets/icons/heroicons/outline/chart-pie.svg" colorClass="bg-blue-500/10 text-blue-600">
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">1,250</p>
          <p class="text-muted-foreground text-xs">Total Students</p>
        </div>
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">85</p>
          <p class="text-muted-foreground text-xs">Teachers</p>
        </div>
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">42</p>
          <p class="text-muted-foreground text-xs">Classes</p>
        </div>
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">95%</p>
          <p class="text-muted-foreground text-xs">Attendance</p>
        </div>
      </div>
    </app-dashboard-widget>
  `,
})
export class SchoolOverviewComponent {}
