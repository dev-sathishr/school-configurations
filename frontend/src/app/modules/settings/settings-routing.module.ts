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
import { UserGroupListComponent } from './pages/user-group/user-group-list/user-group-list.component';
import { UserGroupFormComponent } from './pages/user-group/user-group-form/user-group-form.component';

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
      { path: 'user-group', component: UserGroupListComponent },
      { path: 'user-group/new', component: UserGroupFormComponent },
      { path: 'user-group/:id/edit', component: UserGroupFormComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
