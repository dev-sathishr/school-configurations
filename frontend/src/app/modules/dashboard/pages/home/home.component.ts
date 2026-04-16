import { Component } from '@angular/core';
import { PermissionService } from '../../../../core/services/permission.service';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { SchoolOverviewComponent } from '../../components/widgets/school-overview.component';
import { AcademicSummaryComponent } from '../../components/widgets/academic-summary.component';
import { FeeCollectionComponent } from '../../components/widgets/fee-collection.component';
import { MyClassesComponent } from '../../components/widgets/my-classes.component';
import { MyGradesComponent } from '../../components/widgets/my-grades.component';
import { ChildProgressComponent } from '../../components/widgets/child-progress.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  imports: [
    HasPermissionDirective,
    SchoolOverviewComponent,
    AcademicSummaryComponent,
    FeeCollectionComponent,
    MyClassesComponent,
    MyGradesComponent,
    ChildProgressComponent,
  ],
})
export class HomeComponent {
  constructor(public ps: PermissionService) {}
}
