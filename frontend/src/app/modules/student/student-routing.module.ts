import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StudentComponent } from './student.component';
import { MenuHomeComponent } from '../../shared/components/menu-home/menu-home.component';
import { StudentProfileListComponent } from './pages/admission-management/student-profile/student-profile-list/student-profile-list.component';
import { StudentProfileDetailsComponent } from './pages/admission-management/student-profile-details/student-profile-details.component';
import { StudentProfileFormComponent } from './pages/admission-management/student-profile/student-profile-form/student-profile-form.component';
import { ModuleAccessGuard } from '../../core/guards/module-access.guard';
import { ModulePermissionGuard } from '../../core/guards/module-permission.guard';

const routes: Routes = [
  {
    path: '',
    component: StudentComponent,
    children: [
      { path: '', component: MenuHomeComponent },
      {
        path: 'admission',
        canActivate: [ModuleAccessGuard],
        data: { moduleCodes: ['STUDENT_PROFILE', 'ENQUIRY', 'RECOMMENDATIONS', 'ASSESSMENTS', 'REGISTRATIONS'] },
        children: [
          { path: '', component: StudentProfileListComponent },
          {
            path: 'new',
            component: StudentProfileFormComponent,
            canActivate: [ModulePermissionGuard],
            data: { moduleCode: 'STUDENT_PROFILE', permission: 'CREATE' },
          },
          { path: ':id/edit', component: StudentProfileDetailsComponent },
          { path: ':id/view', component: StudentProfileDetailsComponent },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StudentRoutingModule {}
