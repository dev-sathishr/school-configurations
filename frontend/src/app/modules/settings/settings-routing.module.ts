import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { SettingsHomeComponent } from './pages/home/settings-home.component';
import { UserListComponent } from './pages/user/user-list/user-list.component';
import { UserFormComponent } from './pages/user/user-form/user-form.component';
import { OrganizationListComponent } from './pages/organization/organization-list/organization-list.component';
import { OrganizationFormComponent } from './pages/organization/organization-form/organization-form.component';
import { LocationListComponent } from './pages/location/location-list/location-list.component';
import { LocationFormComponent } from './pages/location/location-form/location-form.component';
import { ModuleListComponent } from './pages/module/module-list/module-list.component';
import { ModuleFormComponent } from './pages/module/module-form/module-form.component';
import { MenuListComponent } from './pages/menu/menu-list/menu-list.component';
import { MenuFormComponent } from './pages/menu/menu-form/menu-form.component';
import { GroupListComponent } from './pages/group/group-list/group-list.component';
import { GroupFormComponent } from './pages/group/group-form/group-form.component';
import { PermissionListComponent } from './pages/permission/permission-list/permission-list.component';
import { PermissionFormComponent } from './pages/permission/permission-form/permission-form.component';
import { SessionListComponent } from './pages/session/session-list/session-list.component';
import { SessionDetailComponent } from './pages/session/session-detail/session-detail.component';
import { AcademicYearListComponent } from './pages/academic-year/academic-year-list/academic-year-list.component';
import { AcademicYearFormComponent } from './pages/academic-year/academic-year-form/academic-year-form.component';
import { ModulePermissionGuard } from '../../core/guards/module-permission.guard';
import { UnsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

const routes: Routes = [
  {
    path: '',
    component: SettingsComponent,
    children: [
      { path: '', component: SettingsHomeComponent },

      { path: 'user', component: UserListComponent },
      { path: 'user/new', component: UserFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'USERS', permission: 'CREATE' }, canDeactivate: [UnsavedChangesGuard] },
      { path: 'user/:id/view', component: UserFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'USERS', permission: 'VIEW' } },
      { path: 'user/:id/edit', component: UserFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'USERS', permission: 'EDIT' }, canDeactivate: [UnsavedChangesGuard] },

      { path: 'organization', component: OrganizationListComponent },
      { path: 'organization/new', component: OrganizationFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'ORGANIZATIONS', permission: 'CREATE' }, canDeactivate: [UnsavedChangesGuard] },
      { path: 'organization/:id/view', component: OrganizationFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'ORGANIZATIONS', permission: 'VIEW' } },
      { path: 'organization/:id/edit', component: OrganizationFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'ORGANIZATIONS', permission: 'EDIT' }, canDeactivate: [UnsavedChangesGuard] },

      { path: 'location', component: LocationListComponent },
      { path: 'location/new', component: LocationFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'LOCATIONS', permission: 'CREATE' }, canDeactivate: [UnsavedChangesGuard] },
      { path: 'location/:id/view', component: LocationFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'LOCATIONS', permission: 'VIEW' } },
      { path: 'location/:id/edit', component: LocationFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'LOCATIONS', permission: 'EDIT' }, canDeactivate: [UnsavedChangesGuard] },

      { path: 'module', component: ModuleListComponent },
      { path: 'module/new', component: ModuleFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'MODULES', permission: 'CREATE' }, canDeactivate: [UnsavedChangesGuard] },
      { path: 'module/:id/view', component: ModuleFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'MODULES', permission: 'VIEW' } },
      { path: 'module/:id/edit', component: ModuleFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'MODULES', permission: 'EDIT' }, canDeactivate: [UnsavedChangesGuard] },

      { path: 'menu', component: MenuListComponent },
      { path: 'menu/new', component: MenuFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'MENUS', permission: 'CREATE' }, canDeactivate: [UnsavedChangesGuard] },
      { path: 'menu/:id/view', component: MenuFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'MENUS', permission: 'VIEW' } },
      { path: 'menu/:id/edit', component: MenuFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'MENUS', permission: 'EDIT' }, canDeactivate: [UnsavedChangesGuard] },

      { path: 'group', component: GroupListComponent },
      { path: 'group/new', component: GroupFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'GROUPS', permission: 'CREATE' }, canDeactivate: [UnsavedChangesGuard] },
      { path: 'group/:id/view', component: GroupFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'GROUPS', permission: 'VIEW' } },
      { path: 'group/:id/edit', component: GroupFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'GROUPS', permission: 'EDIT' }, canDeactivate: [UnsavedChangesGuard] },

      { path: 'permission', component: PermissionListComponent },
      { path: 'permission/new', component: PermissionFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'PERMISSIONS', permission: 'CREATE' }, canDeactivate: [UnsavedChangesGuard] },
      { path: 'permission/:id/view', component: PermissionFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'PERMISSIONS', permission: 'VIEW' } },
      { path: 'permission/:id/edit', component: PermissionFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'PERMISSIONS', permission: 'EDIT' }, canDeactivate: [UnsavedChangesGuard] },

      { path: 'session', component: SessionListComponent },
      { path: 'session/:id/view', component: SessionDetailComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'SESSIONS', permission: 'VIEW' } },

      { path: 'academic-year', component: AcademicYearListComponent },
      { path: 'academic-year/new', component: AcademicYearFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'ACADEMIC_YEARS', permission: 'CREATE' }, canDeactivate: [UnsavedChangesGuard] },
      { path: 'academic-year/:id/view', component: AcademicYearFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'ACADEMIC_YEARS', permission: 'VIEW' } },
      { path: 'academic-year/:id/edit', component: AcademicYearFormComponent, canActivate: [ModulePermissionGuard], data: { moduleCode: 'ACADEMIC_YEARS', permission: 'EDIT' }, canDeactivate: [UnsavedChangesGuard] },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
