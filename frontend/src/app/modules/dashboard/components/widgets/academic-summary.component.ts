import { Component } from '@angular/core';
import { DashboardWidgetComponent } from './dashboard-widget.component';

@Component({
  selector: 'app-academic-summary',
  standalone: true,
  imports: [DashboardWidgetComponent],
  template: `
    <app-dashboard-widget title="Academic Summary" icon="assets/icons/heroicons/outline/bookmark.svg" colorClass="bg-purple-500/10 text-purple-600">
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">12</p>
          <p class="text-muted-foreground text-xs">Subjects</p>
        </div>
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">8</p>
          <p class="text-muted-foreground text-xs">Exams Scheduled</p>
        </div>
        <div class="text-center">
          <p class="text-foreground text-2xl font-bold">78%</p>
          <p class="text-muted-foreground text-xs">Avg. Pass Rate</p>
        </div>
      </div>
    </app-dashboard-widget>
  `,
})
export class AcademicSummaryComponent {}
