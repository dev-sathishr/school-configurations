import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AcademicComponent } from './academic.component';
import { AcademicHomeComponent } from './pages/home/academic-home.component';
import { ClassListComponent } from './pages/class/class-list/class-list.component';
import { ClassFormComponent } from './pages/class/class-form/class-form.component';
import { ModulePermissionGuard } from '../../core/guards/module-permission.guard';

const routes: Routes = [
  {
    path: '',
    component: AcademicComponent,
    children: [
      { path: '', component: AcademicHomeComponent },
      { path: 'class', component: ClassListComponent },
      { path: 'class/new', component: ClassFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'CLASSES', permission: 'CREATE' } },
      { path: 'class/:id/edit', component: ClassFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'CLASSES', permission: 'EDIT' } },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AcademicRoutingModule {}
