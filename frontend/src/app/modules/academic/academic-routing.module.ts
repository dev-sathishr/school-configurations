import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AcademicComponent } from './academic.component';
import { AcademicHomeComponent } from './pages/home/academic-home.component';
import { ClassMasterComponent } from './pages/class/class-master/class-master.component';
import { ModuleAccessGuard } from '../../core/guards/module-access.guard';

const routes: Routes = [
  {
    path: '',
    component: AcademicComponent,
    children: [
      { path: '', component: AcademicHomeComponent },
      {
        path: 'class',
        component: ClassMasterComponent,
        canActivate: [ModuleAccessGuard],
        data: { moduleCodes: ['CLASSES', 'CLASS_LEVELS'] },
      },
      { path: 'class/new', redirectTo: 'class', pathMatch: 'full' },
      { path: 'class/:id/view', redirectTo: 'class', pathMatch: 'full' },
      { path: 'class/:id/edit', redirectTo: 'class', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AcademicRoutingModule {}
