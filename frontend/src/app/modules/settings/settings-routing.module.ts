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
import { MenuModuleListComponent } from './pages/menu-module/menu-module-list/menu-module-list.component';
import { MenuModuleFormComponent } from './pages/menu-module/menu-module-form/menu-module-form.component';
import { GroupListComponent } from './pages/group/group-list/group-list.component';
import { GroupFormComponent } from './pages/group/group-form/group-form.component';
import { GroupModuleListComponent } from './pages/group-module/group-module-list/group-module-list.component';
import { GroupModuleFormComponent } from './pages/group-module/group-module-form/group-module-form.component';
import { PermissionListComponent } from './pages/permission/permission-list/permission-list.component';
import { PermissionFormComponent } from './pages/permission/permission-form/permission-form.component';

const routes: Routes = [
  {
    path: '',
    component: SettingsComponent,
    children: [
      { path: '', component: SettingsHomeComponent },
      { path: 'user', component: UserListComponent },
      { path: 'user/new', component: UserFormComponent },
      { path: 'user/:id/edit', component: UserFormComponent },
      { path: 'organization', component: OrganizationListComponent },
      { path: 'organization/new', component: OrganizationFormComponent },
      { path: 'organization/:id/edit', component: OrganizationFormComponent },
      { path: 'location', component: LocationListComponent },
      { path: 'location/new', component: LocationFormComponent },
      { path: 'location/:id/edit', component: LocationFormComponent },
      { path: 'module', component: ModuleListComponent },
      { path: 'module/new', component: ModuleFormComponent },
      { path: 'module/:id/edit', component: ModuleFormComponent },
      { path: 'menu', component: MenuListComponent },
      { path: 'menu/new', component: MenuFormComponent },
      { path: 'menu/:id/edit', component: MenuFormComponent },
      { path: 'menu-module', component: MenuModuleListComponent },
      { path: 'menu-module/new', component: MenuModuleFormComponent },
      { path: 'menu-module/:id/edit', component: MenuModuleFormComponent },
      { path: 'group', component: GroupListComponent },
      { path: 'group/new', component: GroupFormComponent },
      { path: 'group/:id/edit', component: GroupFormComponent },
      { path: 'group-module', component: GroupModuleListComponent },
      { path: 'group-module/new', component: GroupModuleFormComponent },
      { path: 'group-module/:id/edit', component: GroupModuleFormComponent },
      { path: 'permission', component: PermissionListComponent },
      { path: 'permission/new', component: PermissionFormComponent },
      { path: 'permission/:id/edit', component: PermissionFormComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
