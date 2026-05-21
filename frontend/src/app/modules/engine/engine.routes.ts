import { Routes } from '@angular/router';
import { DoctypeListComponent } from './meta/doctype-list/doctype-list.component';
import { DoctypeFormComponent } from './meta/doctype-form/doctype-form.component';
import { DynamicListComponent } from '../dynamic/dynamic-list/dynamic-list.component';
import { DynamicFormComponent } from '../dynamic/dynamic-form/dynamic-form.component';
import { MenuHomeComponent } from '../../shared/components/menu-home/menu-home.component';
import { ModuleAccessGuard } from '../../core/guards/module-access.guard';
import { ModulePermissionGuard } from '../../core/guards/module-permission.guard';
import { UnsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

export const engineRoutes: Routes = [
  {
    path: '',
    component: MenuHomeComponent,
  },

  // ── DocType Builder (admin) ───────────────────────────────────────────
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

  // ── Dynamic DocType pages (/engine/d/:slug) ──────────────────────────
  // Order matters: new before :id so "new" is not captured as an id
  {
    path: 'd/:slug',
    component: DynamicListComponent,
  },
  {
    path: 'd/:slug/new',
    component: DynamicFormComponent,
    canDeactivate: [UnsavedChangesGuard],
  },
  {
    path: 'd/:slug/:id/edit',
    component: DynamicFormComponent,
    canDeactivate: [UnsavedChangesGuard],
  },
  {
    path: 'd/:slug/:id/view',
    component: DynamicFormComponent,
  },
];
