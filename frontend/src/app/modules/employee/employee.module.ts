import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ModuleAccessGuard } from '../../core/guards/module-access.guard';
import { EmployeeComponent } from './employee.component';
import { EmployeeMasterComponent } from './pages/employee-master/employee-master.component';
import { EmployeeInfoListComponent } from './pages/employee-info/employee-info-list/employee-info-list.component';
import { EmployeeInfoFormComponent } from './pages/employee-info/employee-info-form/employee-info-form.component';
import { MenuHomeComponent } from '../../shared/components/menu-home/menu-home.component';

const routes: Routes = [
  {
    path: '',
    component: EmployeeComponent,
    children: [
      { path: '', component: MenuHomeComponent },
      {
        path: 'employee-master',
        component: EmployeeMasterComponent,
        canActivate: [ModuleAccessGuard],
        data: { moduleCodes: ['EMPLOYEE_CATEGORIES', 'EMPLOYEE_GROUPS', 'DESIGNATIONS'] },
      },
      {
        path: 'employee-info',
        component: EmployeeInfoListComponent,
        canActivate: [ModuleAccessGuard],
        data: { moduleCodes: ['EMPLOYEE_INFO'] },
      },
      {
        path: 'employee-info/new',
        component: EmployeeInfoFormComponent,
        canActivate: [ModuleAccessGuard],
        data: { moduleCodes: ['EMPLOYEE_INFO'] },
      },
      {
        path: 'employee-info/:id/edit',
        component: EmployeeInfoFormComponent,
        canActivate: [ModuleAccessGuard],
        data: { moduleCodes: ['EMPLOYEE_INFO'] },
      },
      {
        path: 'employee-info/:id/view',
        component: EmployeeInfoFormComponent,
        canActivate: [ModuleAccessGuard],
        data: { moduleCodes: ['EMPLOYEE_INFO'] },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EmployeeModule {}
