import { Routes } from '@angular/router';
import { DoctypeListComponent } from './meta/doctype-list/doctype-list.component';
import { DoctypeFormComponent } from './meta/doctype-form/doctype-form.component';
import { MenuHomeComponent } from '../../shared/components/menu-home/menu-home.component';
import { ModuleAccessGuard } from '../../core/guards/module-access.guard';
import { ModulePermissionGuard } from '../../core/guards/module-permission.guard';
import { UnsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

export const engineRoutes: Routes = [
  {
    path: '',
    component: MenuHomeComponent,
  },
  {
    path: 'meta',
    component: DoctypeListComponent,
    canActivate: [ModuleAccessGuard],
    data: { moduleCode: 'ENGINE_META' },
  },
  {
    path: 'meta/new',
    component: DoctypeFormComponent,
    canActivate: [ModulePermissionGuard],
    data: { moduleCode: 'ENGINE_META', permission: 'CREATE' },
    canDeactivate: [UnsavedChangesGuard],
  },
  {
    path: 'meta/:slug/edit',
    component: DoctypeFormComponent,
    canActivate: [ModulePermissionGuard],
    data: { moduleCode: 'ENGINE_META', permission: 'EDIT' },
    canDeactivate: [UnsavedChangesGuard],
  },
  {
    path: 'meta/:slug/view',
    component: DoctypeFormComponent,
    canActivate: [ModulePermissionGuard],
    data: { moduleCode: 'ENGINE_META', permission: 'VIEW', mode: 'view' },
  },
];
