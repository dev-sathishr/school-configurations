import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DynamicListComponent } from './dynamic-list/dynamic-list.component';
import { DynamicFormComponent } from './dynamic-form/dynamic-form.component';
import { SessionListComponent } from '../settings/pages/session/session-list/session-list.component';
import { SessionDetailComponent } from '../settings/pages/session/session-detail/session-detail.component';
import { UserAnalyticsComponent } from '../settings/pages/session/user-analytics/user-analytics.component';
import { ModuleAccessGuard } from '../../core/guards/module-access.guard';
import { ModulePermissionGuard } from '../../core/guards/module-permission.guard';
import { UnsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';
import { MenuHomeComponent } from '../../shared/components/menu-home/menu-home.component';

const routes: Routes = [
  { path: '', component: MenuHomeComponent },

  // Named routes for session management — must come before :slug wildcard
  { path: 'session', component: SessionListComponent, canActivate: [ModuleAccessGuard], data: { moduleCode: 'SESSIONS' } },
  { path: 'session/users/:userId/analytics', component: UserAnalyticsComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'SESSIONS', permission: 'VIEW' } },
  { path: 'session/:id/view', component: SessionDetailComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'SESSIONS', permission: 'VIEW' } },

  // Generic DocType routes — match any slug
  // DynamicListComponent handles page + modal display modes
  // DynamicTabGroupComponent handles tab-group display mode (no child form routes needed)
  {
    path: ':slug',
    component: DynamicListComponent,
    canActivate: [ModuleAccessGuard],
  },
  {
    path: ':slug/new',
    component: DynamicFormComponent,
    canActivate: [ModulePermissionGuard],
    data: { permission: 'CREATE' },
    canDeactivate: [UnsavedChangesGuard],
  },
  {
    path: ':slug/:id/view',
    component: DynamicFormComponent,
    canActivate: [ModulePermissionGuard],
    data: { permission: 'VIEW' },
  },
  {
    path: ':slug/:id/edit',
    component: DynamicFormComponent,
    canActivate: [ModulePermissionGuard],
    data: { permission: 'EDIT' },
    canDeactivate: [UnsavedChangesGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DynamicRoutingModule {}
