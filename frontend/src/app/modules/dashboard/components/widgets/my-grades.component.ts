import { Component } from '@angular/core';
import { DashboardWidgetComponent } from './dashboard-widget.component';

@Component({
  selector: 'app-my-grades',
  standalone: true,
  imports: [DashboardWidgetComponent],
  template: `
    <app-dashboard-widget title="My Grades" icon="assets/icons/heroicons/outline/table-cells.svg" colorClass="bg-indigo-500/10 text-indigo-600">
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">A+</p>
          <p class="text-muted-foreground text-xs">Overall Grade</p>
        </div>
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">92%</p>
          <p class="text-muted-foreground text-xs">Average Score</p>
        </div>
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">3</p>
          <p class="text-muted-foreground text-xs">Rank in Class</p>
        </div>
      </div>
    </app-dashboard-widget>
  `,
})
export class MyGradesComponent {}
