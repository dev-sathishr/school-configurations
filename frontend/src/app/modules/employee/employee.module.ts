import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ModuleAccessGuard } from '../../core/guards/module-access.guard';
import { EmployeeComponent } from './employee.component';
import { EmployeeMasterComponent } from './pages/employee-master/employee-master.component';
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
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EmployeeModule {}
