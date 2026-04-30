import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StudentComponent } from './student.component';
import { MenuHomeComponent } from '../../shared/components/menu-home/menu-home.component';
import { AdmissionManagementListComponent } from './pages/admission-management/admission-management-list/admission-management-list.component';
import { StudentProfileFormComponent } from './pages/admission-management/student-profile-form/student-profile-form.component';
import { ModuleAccessGuard } from '../../core/guards/module-access.guard';

const routes: Routes = [
  {
    path: '',
    component: StudentComponent,
    children: [
      { path: '', component: MenuHomeComponent },
      {
        path: 'admission',
        canActivate: [ModuleAccessGuard],
        data: { moduleCodes: ['ADMISSION_MANAGEMENT'] },
        children: [
          { path: '', component: AdmissionManagementListComponent },
          { path: 'new', component: StudentProfileFormComponent },
          { path: ':id/edit', component: StudentProfileFormComponent },
          { path: ':id/view', component: StudentProfileFormComponent },
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
