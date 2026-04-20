import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileComponent } from './profile.component';
import { OverviewComponent } from './pages/overview/overview.component';
import { AppearanceComponent } from './pages/appearance/appearance.component';
import { TablesComponent } from './pages/tables/tables.component';
import { FavoritesComponent } from './pages/favorites/favorites.component';
import { MySessionsComponent } from './pages/sessions/my-sessions.component';

const routes: Routes = [
  {
    path: '',
    component: ProfileComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'overview', component: OverviewComponent },
      { path: 'appearance', component: AppearanceComponent },
      { path: 'tables', component: TablesComponent },
      { path: 'favorites', component: FavoritesComponent },
      { path: 'sessions', component: MySessionsComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProfileRoutingModule {}
