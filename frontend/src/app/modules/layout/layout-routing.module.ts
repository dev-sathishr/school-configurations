import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { DefaultRedirectGuard } from '../../core/guards/default-redirect.guard';
import { MenuAccessGuard } from '../../core/guards/menu-access.guard';
import { NoAccessComponent } from './pages/no-access/no-access.component';

const routes: Routes = [
  {
    path: 'no-access',
    component: LayoutComponent,
    children: [{ path: '', component: NoAccessComponent }],
  },
  {
    path: 'dashboard',
    component: LayoutComponent,
    canActivate: [MenuAccessGuard],
    data: { menuCode: 'DASHBOARD' },
    loadChildren: () => import('../dashboard/dashboard.module').then((m) => m.DashboardModule),
  },
  {
    path: 'academic',
    component: LayoutComponent,
    canActivate: [MenuAccessGuard],
    data: { menuCode: 'ACADEMIC' },
    loadChildren: () => import('../academic/academic.module').then((m) => m.AcademicModule),
  },
  {
    path: 'employee',
    component: LayoutComponent,
    canActivate: [MenuAccessGuard],
    data: { menuCode: 'EMPLOYEE' },
    loadChildren: () => import('../employee/employee.module').then((m) => m.EmployeeModule),
  },
  {
    path: 'student',
    component: LayoutComponent,
    canActivate: [MenuAccessGuard],
    data: { menuCode: 'STUDENT' },
    loadChildren: () => import('../student/student.module').then((m) => m.StudentModule),
  },
  {
    path: 'master',
    component: LayoutComponent,
    canActivate: [MenuAccessGuard],
    data: { menuCode: 'MASTER' },
    loadChildren: () => import('../master/master.module').then((m) => m.MasterModule),
  },
  {
    path: 'settings',
    component: LayoutComponent,
    canActivate: [MenuAccessGuard],
    data: { menuCode: 'SETTINGS' },
    loadChildren: () => import('../settings/settings.module').then((m) => m.SettingsModule),
  },
  {
    path: 'profile',
    component: LayoutComponent,
    loadChildren: () => import('../profile/profile.module').then((m) => m.ProfileModule),
  },
  {
    path: '',
    canActivate: [DefaultRedirectGuard],
    children: [],
  },
  { path: '**', redirectTo: 'error/404' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LayoutRoutingModule {}
