import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MasterComponent } from './master.component';
import { MenuHomeComponent } from '../../shared/components/menu-home/menu-home.component';
import { SequenceMasterComponent } from './pages/sequence-master/sequence-master.component';
import { DocumentTypeComponent } from './pages/document-type/document-type.component';
import { FeeCategoryPageComponent } from './pages/fee-category/fee-category-page.component';
import { ModuleAccessGuard } from '../../core/guards/module-access.guard';

const routes: Routes = [
  {
    path: '',
    component: MasterComponent,
    children: [
      { path: '', component: MenuHomeComponent },
      {
        path: 'sequence',
        component: SequenceMasterComponent,
        canActivate: [ModuleAccessGuard],
        data: { moduleCodes: ['SEQUENCE_CODES', 'SEQUENCE_CONTROLS'] },
      },
      {
        path: 'document-types',
        component: DocumentTypeComponent,
        canActivate: [ModuleAccessGuard],
        data: { moduleCodes: ['DOCUMENT_TYPES'] },
      },
      {
        path: 'fee-categories',
        component: FeeCategoryPageComponent,
        canActivate: [ModuleAccessGuard],
        data: { moduleCodes: ['FEE_CATEGORIES'] },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MasterModule {}
